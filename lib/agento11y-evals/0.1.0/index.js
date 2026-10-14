// agento11y-evals — run offline evals against Grafana Agent Observability from k6.
//
// Test suites and evaluators are authored in the Agent Observability app; this library runs a
// published suite version against your agent from k6 (locally or in CI), grades every case with
// the version's evaluators, and reports the run as an experiment, so runs are comparable over
// time instead of only passing or failing.
//
//   import http from 'k6/http';
//   import { check } from 'k6';
//   import { client } from 'https://jslib.k6.io/agento11y-evals/0.1.0/index.js';
//
//   const evals = client({
//     apiUrl: __ENV.AGENTO11Y_ENDPOINT,                        // runs, trials and scores
//     tenantId: __ENV.AGENTO11Y_AUTH_TENANT_ID,
//     token: __ENV.AGENTO11Y_AUTH_TOKEN,
//     grafanaUrl: __ENV.AGENTO11Y_GRAFANA_URL,                  // report links, and with a
//     serviceAccountToken: __ENV.AGENTO11Y_SERVICE_ACCOUNT_TOKEN, // token: reading the suite
//   });
//
//   export async function setup() {
//     const suite = await evals.pullSuite('my-suite', 'v1');
//     const exp = await evals.createExperiment({ name: 'nightly', suite, plannedTrialCount: suite.cases.length });
//     return { experimentId: exp.id, suite };
//   }
//
//   export default async function ({ experimentId, suite }) {
//     const exp = evals.experiment(experimentId, suite);
//     for (const testCase of suite.cases) {
//       const result = await exp.run({ testCase }, async (trial) => {
//         // Your agent, recording its generations under trial.id as the conversation id.
//         await http.asyncRequest('POST', __ENV.AGENT_URL, JSON.stringify({ prompt: testCase.input.prompt, conversation_id: trial.id }));
//         await trial.complete({ conversationId: trial.id });
//       });
//       check(result, { [testCase.test_case_id]: (r) => r.passed });
//     }
//   }
//
//   export async function teardown({ experimentId }) {
//     console.log(await evals.experiment(experimentId).finalize());
//   }
//
// Every call is async (http.asyncRequest), so it mixes with other async code; await each one.
//
// `run()` is the easy path: it creates the trial with the case's snapshot, always leaves it
// terminal (a running trial blocks finalize), grades it with every evaluator bound to the suite
// version, and writes the `final` verdict: passed only if every score(), grade() and bound
// evaluator inside it passed. It never rejects, so one broken trial cannot abort the rest.
// Outside `run()`, every call rejects on a non-2xx response: a 401 read is otherwise
// indistinguishable from an empty suite, which is a painful way to spend an afternoon.

import http from 'k6/http';
import encoding from 'k6/encoding';

// Without a primary_verdict score, the report counts this score key as each trial's verdict.
const HEADLINE_SCORE_KEY = 'final';
const PRIMARY = 'primary_verdict';
const PLUGIN_RESOURCES = '/api/plugins/grafana-agento11y-app/resources/eval';

// The fields a trial's test-case snapshot accepts; the server compares them with the published case.
const SNAPSHOT_FIELDS = [
  'test_case_id',
  'suite_id',
  'suite_version',
  'name',
  'description',
  'tags',
  'category',
  'input',
  'expected',
  'metadata',
  'artifact_refs',
];

export function client({ apiUrl, tenantId, token, grafanaUrl, serviceAccountToken }) {
  // Checked on the first request, not here, so a script can build its client at module scope and
  // still be inspected (`k6 inspect`) without credentials.
  const base = (apiUrl || '').replace(/\/+$/, '');
  const grafana = (grafanaUrl || '').replace(/\/+$/, '');
  const enc = encodeURIComponent;

  async function send(method, url, body, authorization) {
    const res = await http.asyncRequest(method, url, body ? JSON.stringify(body) : null, {
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    });
    if (res.status >= 300) {
      throw new Error(`agento11y-evals: ${method} ${url} -> ${res.status} ${res.body}`);
    }
    return res.json();
  }

  // Runs, trials, scores and generations: the ingest API, with the stack's write token.
  async function request(method, path, body) {
    if (!apiUrl || !tenantId || !token) {
      throw new Error('agento11y-evals: apiUrl, tenantId and token are required');
    }
    return send(method, base + path, body, `Basic ${encoding.b64encode(`${tenantId}:${token}`)}`);
  }

  // Suite reads. With a Grafana service account token (Data Reader), through the app, as the
  // app's setup screen suggests: the ingest token it mints is write-only. Without one, with the
  // ingest token, which then needs read access too.
  async function readSuite(path) {
    if (serviceAccountToken) {
      if (!grafanaUrl) {
        throw new Error('agento11y-evals: grafanaUrl is required with serviceAccountToken');
      }
      return send('GET', grafana + PLUGIN_RESOURCES + path, null, `Bearer ${serviceAccountToken}`);
    }
    return request('GET', `/api/v1/eval${path}`);
  }

  // The API answers 200 even when it rejects a score; a re-export of the same id is a duplicate.
  async function exportScore(score) {
    const body = await request('POST', '/api/v1/scores:export', {
      scores: [{ evaluator_version: '1', source: { kind: 'external_api', id: 'k6' }, ...score }],
    });
    const result = (body.results || [])[0];
    if (!result || result.status === 'rejected') {
      throw new Error(`agento11y-evals: score rejected: ${JSON.stringify(result || body)}`);
    }
  }

  // A published suite version with its cases and evaluator bindings. Only a published version is
  // a checkpoint: its cases and evaluators cannot change, so runs of it are comparable.
  async function pullSuite(suiteId, version) {
    if (!suiteId || !version) {
      throw new Error('agento11y-evals: suiteId and version are required');
    }
    const suitePath = `/test-suites/${enc(suiteId)}`;
    const versionPath = `${suitePath}/versions/${enc(version)}`;
    const found = ((await readSuite(suitePath)).versions || []).find((v) => v.version === version);
    if (!found || !found.published) {
      throw new Error(`agento11y-evals: ${suiteId} ${version} is not a published version`);
    }
    const cases = [];
    let cursor = '';
    do {
      const body = await readSuite(`${versionPath}/test-cases?limit=200${cursor ? `&cursor=${enc(cursor)}` : ''}`);
      cases.push(...(body.items || []));
      cursor = body.next_cursor && body.next_cursor !== '0' ? body.next_cursor : '';
    } while (cursor);
    return { suite_id: suiteId, version, cases, bindings: (await readSuite(`${versionPath}/bindings`)).items || [] };
  }

  // Every score of an experiment. The API pages them (50 by default) and has no trial filter, so
  // a read of the first page alone misses verdicts once an experiment has more than a few trials.
  async function listScores(experimentId) {
    const path = `/api/v1/eval/experiments/${enc(experimentId)}/scores?limit=200`;
    const scores = [];
    let cursor = '';
    do {
      const body = await request('GET', path + (cursor ? `&cursor=${enc(cursor)}` : ''));
      scores.push(...(body.items || []));
      cursor = body.next_cursor;
    } while (cursor);
    return scores;
  }

  function experiment(experimentId, suite) {
    const encodedExperiment = enc(experimentId);

    async function trial({ testCase, testCaseId, attempt, trialId }, managed) {
      const caseId = testCase ? testCase.test_case_id : testCaseId;
      if (!caseId) {
        throw new Error('agento11y-evals: testCase or testCaseId is required');
      }
      // Trials must be created `running` — a terminal status on create is rejected — and `attempt`
      // is 1-based. Trial ids are unique per tenant, not per experiment, so scope the default.
      const snapshot = {};
      for (const field of SNAPSHOT_FIELDS) {
        if (testCase && testCase[field] !== undefined) snapshot[field] = testCase[field];
      }
      const created = await request('POST', `/api/v1/experiment-runs/${encodedExperiment}/trials`, {
        trial_id: trialId || `${experimentId}_${caseId}_a${attempt || 1}`,
        test_case_id: caseId,
        attempt: attempt || 1,
        status: 'running',
        ...(testCase ? { test_case: snapshot } : {}),
      });
      const id = created.trial_id;
      const trialPath = `/api/v1/experiment-runs/${encodedExperiment}/trials/${enc(id)}`;

      const api = {
        id,
        testCaseId: caseId,
        conversationId: null,
        completed: false,
        // Every verdict score() and grade() recorded, from which run() writes `final`.
        verdicts: [],
        // Set once an evaluator recorded the trial's primary verdict.
        hasPrimary: false,

        // Record the agent's exchange as this trial's conversation, under trial.id, for an agent
        // that does not report to Agent Observability itself. Evaluators read this conversation.
        async record({ input, output, model, agentName }) {
          const body = await request('POST', '/api/v1/generations:export', {
            generations: [
              {
                id: `gen_${id}`,
                conversation_id: id,
                agent_name: agentName || 'k6',
                mode: 'GENERATION_MODE_SYNC',
                model: model || { provider: 'unknown', name: 'unknown' },
                input: [{ role: 'MESSAGE_ROLE_USER', parts: [{ text: String(input) }] }],
                output: [{ role: 'MESSAGE_ROLE_ASSISTANT', parts: [{ text: String(output) }] }],
                tags: { experiment_id: experimentId },
                metadata: { experiment_id: experimentId, trial_id: id, test_case_id: caseId },
              },
            ],
          });
          const result = (body.results || [])[0];
          if (!result || !result.accepted) {
            throw new Error(`agento11y-evals: generation rejected: ${JSON.stringify(result || body)}`);
          }
          api.conversationId = id;
        },

        // Close the trial. `conversationId` links the transcript an evaluator will read; it
        // defaults to the one record() wrote. Omit both for a purely deterministic verdict.
        async complete({ conversationId, cost, inputTokens, outputTokens, durationMs, error } = {}) {
          api.conversationId = conversationId || api.conversationId;
          await request('PATCH', trialPath, {
            status: error ? 'failed' : 'completed',
            ...(api.conversationId ? { conversation_id: api.conversationId } : {}),
            ...(cost !== undefined ? { cost } : {}),
            // k6 timings are fractional; the API takes whole milliseconds and tokens.
            ...(inputTokens !== undefined ? { input_tokens: Math.round(inputTokens) } : {}),
            ...(outputTokens !== undefined ? { output_tokens: Math.round(outputTokens) } : {}),
            ...(durationMs !== undefined ? { duration_ms: Math.round(durationMs) } : {}),
            ...(error ? { error: String(error) } : {}),
            completed_at: new Date().toISOString(),
          });
          api.completed = true;
        },

        // Your own verdict. Without a scoreKey it is the trial's headline verdict; inside run(),
        // give it a key and run() writes the headline from all of them.
        async score({ passed, value, explanation, evaluatorId, scoreKey }) {
          if (managed && (!scoreKey || scoreKey === HEADLINE_SCORE_KEY)) {
            throw new Error('agento11y-evals: inside run(), score() needs a scoreKey other than "final"');
          }
          const headline = !scoreKey || scoreKey === HEADLINE_SCORE_KEY;
          if (!headline) {
            api.verdicts.push({ key: scoreKey, passed: Boolean(passed), explanation });
          }
          await exportScore({
            score_id: `sc_${experimentId}_${id}_${scoreKey || HEADLINE_SCORE_KEY}`,
            trial_id: id,
            evaluator_id: evaluatorId || 'k6.assertion',
            score_key: scoreKey || HEADLINE_SCORE_KEY,
            value: { number: typeof value === 'number' ? value : passed ? 1 : 0 },
            passed: Boolean(passed),
            explanation: explanation,
            ...(headline && !api.hasPrimary ? { report_role: PRIMARY } : {}),
          });
          if (headline) api.hasPrimary = true;
        },

        // Grade with an evaluator from the app, or with one of the suite version's bindings
        // (`bindingId`, which brings its own evaluator version and report role). Requires the
        // trial to have a conversation.
        //
        // Grading is asynchronous and Sigil drops queued evaluations once an experiment is
        // finalized, so this waits for a terminal state.
        async grade({ evaluatorId, evaluatorVersion, bindingId, timeoutSeconds }) {
          if (!evaluatorId && !bindingId) {
            throw new Error('agento11y-evals: evaluatorId or bindingId is required');
          }
          const started = await request(
            'POST',
            `${trialPath}:evaluate`,
            bindingId
              ? { binding_id: bindingId }
              : {
                  evaluator_id: evaluatorId,
                  ...(evaluatorVersion ? { evaluator_version: evaluatorVersion } : {}),
                  // Inside run(), the headline is the one run() writes.
                  ...(managed ? { report_role: 'diagnostic' } : {}),
                }
          );
          const key = bindingId || evaluatorId;
          const evaluationPath = `${trialPath}/evaluations/${enc(started.evaluation_id)}`;
          const deadline = Date.now() + (timeoutSeconds || 120) * 1000;
          let status = started.status;
          let error = started.error;
          while (status !== 'success' && status !== 'failed' && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            ({ status, error } = await request('GET', evaluationPath));
          }
          if (status !== 'success') {
            const explanation = `evaluation ${status}${error ? `: ${error}` : ''}`;
            api.verdicts.push({ key, passed: false, explanation });
            return { status, passed: null, value: null, explanation };
          }
          if (started.report_role === PRIMARY) api.hasPrimary = true;

          // One evaluator can emit several score keys: it passes only if every one does.
          const scores = (await listScores(experimentId)).filter(
            (s) => s.trial_id === id && s.evaluator_id === started.evaluator_id && typeof s.passed === 'boolean'
          );
          const failed = scores.find((s) => !s.passed);
          const verdict = failed || scores[scores.length - 1];
          const passed = scores.length > 0 && !failed;
          const explanation = verdict ? verdict.explanation : 'no verdict';
          api.verdicts.push({ key, passed, explanation });
          // Outside run(), the evaluator's verdict becomes the headline unless it already is.
          if (verdict && !managed && !api.hasPrimary && verdict.score_key !== HEADLINE_SCORE_KEY) {
            await api.score({ passed, value: verdict.value && verdict.value.number, explanation, evaluatorId: key });
          }
          return { status, passed, value: verdict && verdict.value ? verdict.value.number : null, explanation };
        },
      };
      return api;
    }

    // Run one trial: fn(trial) calls your agent and records verdicts with score() and grade().
    // Afterwards the trial is closed (with the error, if fn threw), graded with every evaluator
    // bound to the suite version, and `final` is written: passed only if fn returned and every
    // verdict passed. Returns { passed, explanation, trialId }.
    async function run(opts, fn) {
      let t = null;
      let passed = false;
      let explanation;
      try {
        t = await trial(opts, true);
        await fn(t);
        if (!t.completed) await t.complete();
        for (const binding of (suite && suite.bindings) || []) {
          // A binding grades the trial against the case's published snapshot, sent only with testCase.
          if (!opts.testCase || !t.conversationId) {
            const why = opts.testCase ? 'no conversation to grade' : 'needs run({ testCase }), not testCaseId';
            t.verdicts.push({ key: binding.binding_id, passed: false, explanation: why });
            continue;
          }
          try {
            await t.grade({ bindingId: binding.binding_id });
          } catch (e) {
            t.verdicts.push({ key: binding.binding_id, passed: false, explanation: `error: ${e}` });
          }
        }
        const failed = t.verdicts.filter((v) => !v.passed);
        passed = t.verdicts.length > 0 && failed.length === 0;
        explanation = !t.verdicts.length
          ? 'no verdict recorded'
          : failed.length
            ? failed.map((v) => `${v.key}: ${v.explanation}`).join(' | ')
            : t.verdicts.map((v) => v.key).join(' + ') + ' passed';
      } catch (e) {
        explanation = `error: ${e}`;
        if (t && !t.completed) {
          try {
            await t.complete({ error: e });
          } catch (_) {
            // The API is what failed; the trial stays running, but the next one still runs.
          }
        }
      }
      if (t) {
        try {
          // The trial's verdict. When a bound evaluator already gave the primary verdict, this one
          // is kept without a role: the report falls back to it only if that evaluation failed.
          await exportScore({
            score_id: `sc_${experimentId}_${t.id}_${HEADLINE_SCORE_KEY}`,
            trial_id: t.id,
            evaluator_id: 'k6.run',
            score_key: HEADLINE_SCORE_KEY,
            value: { number: passed ? 1 : 0 },
            passed,
            explanation,
            ...(t.hasPrimary ? {} : { report_role: PRIMARY }),
          });
        } catch (e) {
          explanation += ` (final score not written: ${e})`;
        }
      }
      return { passed, explanation, trialId: t ? t.id : null };
    }

    return {
      id: experimentId,
      trial,
      run,

      // Always call this, including on failure: nothing on the backend finalizes an abandoned
      // external experiment, so a crashed run leaves it `running` forever. Returns the report's
      // URL when the client has a grafanaUrl.
      async finalize(status) {
        await request('POST', `/api/v1/experiment-runs/${encodedExperiment}:finalize`, {
          status: status || 'completed',
        });
        return grafana ? `${grafana}/a/grafana-agento11y-app/experiments/runs/${encodedExperiment}` : null;
      },

      // Read the report back, e.g. to fail a build on its pass rate.
      async report() {
        const body = await request('GET', `/api/v1/eval/experiments/${encodedExperiment}/report`);
        return { summary: body.summary || {}, rows: body.rows || [], scores: await listScores(experimentId) };
      },
    };
  }

  return {
    pullSuite,
    listScores,
    experiment,

    // A run of your actual agent. With a `suite` from pullSuite(), the run is linked to that
    // version and shows up next to its other runs in the app.
    async createExperiment({ id, name, suite, candidate, tags, plannedTrialCount }) {
      const experimentId = id || `exp_k6_${Date.now()}`;
      await request('POST', '/api/v1/experiment-runs:upsert', {
        experiment_id: experimentId,
        name: name || 'k6 agent eval',
        ...(suite ? { suite_id: suite.suite_id, suite_version: suite.version } : {}),
        ...(candidate ? { candidate } : {}),
        ...(tags ? { tags } : {}),
        ...(plannedTrialCount !== undefined ? { planned_trial_count: plannedTrialCount } : {}),
        metadata: { execution_kind: 'agent_run' },
      });
      return experiment(experimentId, suite);
    },
  };
}
