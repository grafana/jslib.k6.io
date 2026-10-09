// agento11y-evals — run offline evals against Grafana Agent Observability from k6.
//
// Test suites and evaluators are authored in the Agent Observability app; this library runs them
// from k6 (locally or in CI) and reports every result as an experiment, so runs are comparable
// over time instead of only passing or failing.
//
//   import { client } from 'https://jslib.k6.io/agento11y-evals/0.1.0/index.js';
//
//   const evals = client({ apiUrl: __ENV.AGENTO11Y_API_URL, tenantId: ..., token: ... });
//
//   export function setup() {
//     const exp = evals.createExperiment({ name: 'nightly', suiteId: __ENV.SUITE_ID });
//     return { experimentId: exp.id, cases: evals.listCases(__ENV.SUITE_ID) };
//   }
//
//   export default function ({ experimentId, cases }) {
//     const exp = evals.experiment(experimentId);
//     for (const testCase of cases) {
//       const result = exp.run({ testCaseId: testCase.test_case_id }, (trial) => {
//         const output = runMyAgent(testCase.input, trial.id);   // your agent, recording as trial.id
//         trial.complete({ conversationId: trial.id });
//         trial.score({ scoreKey: 'assert', passed: isValid(output) }); // your own checks
//         trial.grade({ evaluatorId: __ENV.EVALUATOR_ID });             // an evaluator from the app
//       });
//       console.log(testCase.test_case_id, result.passed, result.explanation);
//     }
//   }
//
//   export function teardown({ experimentId }) {
//     evals.experiment(experimentId).finalize();
//   }
//
// `run()` is the easy path: it creates the trial, always leaves it terminal (a running trial
// blocks finalize), and writes the `final` verdict the report counts: passed only if every
// score() and grade() inside it passed. It never throws, so one broken trial cannot abort the
// rest. Outside `run()`, every call throws on a non-2xx response: a 401 read is otherwise
// indistinguishable from an empty suite, which is a painful way to spend an afternoon.

import http from 'k6/http';
import encoding from 'k6/encoding';
import { sleep } from 'k6';

// Only this score key produces a pass rate, pass@k or pass^k in the experiment report. Scores
// under any other key show up as breakdowns, so `grade()` mirrors the evaluator's verdict here.
const HEADLINE_SCORE_KEY = 'final';

export function client({ apiUrl, tenantId, token }) {
  // Checked on the first request, not here, so a script can build its client at module scope and
  // still be inspected (`k6 inspect`) without credentials.
  const base = (apiUrl || '').replace(/\/+$/, '');
  const headers = {
    Authorization: `Basic ${encoding.b64encode(`${tenantId}:${token}`)}`,
    'Content-Type': 'application/json',
  };

  function request(method, path, body) {
    if (!apiUrl || !tenantId || !token) {
      throw new Error('agento11y-evals: apiUrl, tenantId and token are required');
    }
    const res = http.request(method, base + path, body ? JSON.stringify(body) : null, { headers });
    if (res.status >= 300) {
      throw new Error(`agento11y-evals: ${method} ${path} -> ${res.status} ${res.body}`);
    }
    return res.json();
  }

  // Reading suites and reports needs a token with sigil:read; writing needs sigil:write. Tokens
  // minted by the app's setup screen are write-only, so reads 401 until a scope is added.
  function listCases(suiteId, version) {
    const v = version || 'v1';
    const encodedSuite = encodeURIComponent(suiteId);
    const body = request('GET', `/api/v1/eval/test-suites/${encodedSuite}/versions/${v}/test-cases`);
    if (!body.items) {
      throw new Error(`agento11y-evals: unexpected response listing cases: ${JSON.stringify(body)}`);
    }
    return body.items;
  }

  // Every score of an experiment. The API pages them (50 by default) and has no trial filter, so
  // a read of the first page alone misses verdicts once an experiment has more than a few trials.
  function listScores(experimentId) {
    const path = `/api/v1/eval/experiments/${encodeURIComponent(experimentId)}/scores?limit=200`;
    const scores = [];
    let cursor = '';
    do {
      const body = request('GET', path + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''));
      scores.push(...(body.items || []));
      cursor = body.next_cursor;
    } while (cursor);
    return scores;
  }

  // Only for an agent that creates its own conversation id and does not return it, but sets the
  // conversation title from the run name: give each run a unique name and look it up here. If
  // your agent accepts a conversation id, record as `trial.id` instead and link that: no lookup,
  // and no waiting for ingest (evaluations wait for the conversation themselves).
  function findConversationByTitle(title, limit) {
    const items = request('GET', `/api/v1/conversations?limit=${limit || 30}`).items || [];
    const match = items.find((c) => c.title === title);
    if (!match) {
      throw new Error(`agento11y-evals: no conversation titled "${title}"`);
    }
    return match;
  }

  function experiment(experimentId) {
    const encodedExperiment = encodeURIComponent(experimentId);

    function trial({ testCaseId, attempt, trialId }, managed) {
      if (!testCaseId) {
        throw new Error('agento11y-evals: testCaseId is required');
      }
      // Trials must be created `running` — a terminal status on create is rejected — and `attempt`
      // is 1-based. Trial ids are unique per tenant, not per experiment, so scope the default.
      const created = request('POST', `/api/v1/experiment-runs/${encodedExperiment}/trials`, {
        trial_id: trialId || `${experimentId}_${testCaseId}_a${attempt || 1}`,
        test_case_id: testCaseId,
        attempt: attempt || 1,
        status: 'running',
      });
      const id = created.trial_id;
      const encodedTrial = encodeURIComponent(id);
      const trialPath = `/api/v1/experiment-runs/${encodedExperiment}/trials/${encodedTrial}`;

      const api = {
        id,
        completed: false,
        // Every verdict score() and grade() recorded, from which run() writes `final`.
        verdicts: [],

        // Close the trial. `conversationId` links the transcript an evaluator will read; omit it
        // for a purely deterministic verdict.
        complete({ conversationId, cost, inputTokens, outputTokens, durationMs, error } = {}) {
          request('PATCH', trialPath, {
            status: error ? 'failed' : 'completed',
            ...(conversationId ? { conversation_id: conversationId } : {}),
            ...(cost !== undefined ? { cost } : {}),
            ...(inputTokens !== undefined ? { input_tokens: inputTokens } : {}),
            ...(outputTokens !== undefined ? { output_tokens: outputTokens } : {}),
            ...(durationMs !== undefined ? { duration_ms: durationMs } : {}),
            ...(error ? { error: String(error) } : {}),
            completed_at: new Date().toISOString(),
          });
          api.completed = true;
        },

        // Your own verdict. Without a scoreKey it is the headline (`final`) that drives the report;
        // inside run(), give it a key and run() writes `final` from all of them.
        score({ passed, value, explanation, evaluatorId, scoreKey }) {
          if (managed && (!scoreKey || scoreKey === HEADLINE_SCORE_KEY)) {
            throw new Error('agento11y-evals: inside run(), score() needs a scoreKey other than "final"');
          }
          if (scoreKey && scoreKey !== HEADLINE_SCORE_KEY) {
            api.verdicts.push({ key: scoreKey, passed: Boolean(passed), explanation });
          }
          request('POST', '/api/v1/scores:export', {
            scores: [
              {
                score_id: `sc_${experimentId}_${id}_${scoreKey || HEADLINE_SCORE_KEY}`,
                trial_id: id,
                evaluator_id: evaluatorId || 'k6.assertion',
                evaluator_version: '1',
                score_key: scoreKey || HEADLINE_SCORE_KEY,
                value: { number: typeof value === 'number' ? value : passed ? 1 : 0 },
                passed: Boolean(passed),
                explanation: explanation,
                source: { kind: 'external_api', id: 'k6' },
              },
            ],
          });
        },

        // Grade with an evaluator defined in the app. Requires the trial to have a conversation.
        //
        // Grading is asynchronous and Sigil drops queued evaluations once an experiment is
        // finalized, so this waits for a terminal state. It then mirrors the verdict under the
        // headline key, because evaluators emit their own score keys and the report only counts
        // `final` — without this, a run of all-passing trials still reports no pass rate.
        grade({ evaluatorId, evaluatorVersion, timeoutSeconds, mirrorHeadline }) {
          if (!evaluatorId) {
            throw new Error('agento11y-evals: evaluatorId is required');
          }
          const started = request('POST', `${trialPath}:evaluate`, {
            evaluator_id: evaluatorId,
            ...(evaluatorVersion ? { evaluator_version: evaluatorVersion } : {}),
          });
          const evaluationId = encodeURIComponent(started.evaluation_id);
          const deadline = Date.now() + (timeoutSeconds || 120) * 1000;
          let status = started.status;
          while (status !== 'success' && status !== 'failed' && Date.now() < deadline) {
            sleep(2);
            status = request('GET', `${trialPath}/evaluations/${evaluationId}`).status;
          }
          if (status !== 'success') {
            api.verdicts.push({ key: evaluatorId, passed: false, explanation: `evaluation ${status}` });
            return { status, passed: null, value: null };
          }

          const scores = listScores(experimentId).filter((s) => s.trial_id === id && s.evaluator_id === evaluatorId);
          const verdict = scores[scores.length - 1];
          api.verdicts.push({
            key: evaluatorId,
            passed: verdict ? verdict.passed === true : false,
            explanation: verdict ? verdict.explanation : 'no verdict',
          });
          // Inside run(), `final` is written from every verdict instead.
          if (verdict && !managed && mirrorHeadline !== false && verdict.score_key !== HEADLINE_SCORE_KEY) {
            api.score({
              passed: verdict.passed,
              value: verdict.value && verdict.value.number,
              explanation: verdict.explanation,
              evaluatorId: evaluatorId,
            });
          }
          return {
            status,
            passed: verdict ? verdict.passed : null,
            value: verdict && verdict.value ? verdict.value.number : null,
            explanation: verdict ? verdict.explanation : null,
          };
        },
      };
      return api;
    }

    // Run one trial: fn(trial) calls your agent and records verdicts with score() and grade().
    // Afterwards the trial is closed (with the error, if fn threw) and `final` is written: passed
    // only if fn returned and every recorded verdict passed. Returns { passed, explanation }.
    function run(opts, fn) {
      let t = null;
      let passed = false;
      let explanation;
      try {
        t = trial(opts, true);
        fn(t);
        if (!t.completed) t.complete();
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
            t.complete({ error: e });
          } catch (_) {
            // The API is what failed; the trial stays running, but the next one still runs.
          }
        }
      }
      if (t) {
        try {
          // Through the unmanaged path: run() is the one writer of `final`.
          request('POST', '/api/v1/scores:export', {
            scores: [
              {
                score_id: `sc_${experimentId}_${t.id}_${HEADLINE_SCORE_KEY}`,
                trial_id: t.id,
                evaluator_id: 'k6.run',
                evaluator_version: '1',
                score_key: HEADLINE_SCORE_KEY,
                value: { number: passed ? 1 : 0 },
                passed,
                explanation,
                source: { kind: 'external_api', id: 'k6' },
              },
            ],
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
      // external experiment, so a crashed run leaves it `running` forever.
      finalize(status) {
        request('POST', `/api/v1/experiment-runs/${encodedExperiment}:finalize`, {
          status: status || 'completed',
        });
      },

      // Read the report back, e.g. to fail a build. `passRate` is null unless something wrote a
      // `final` score, so prefer `verdictPassRate`, which counts pass/fail across all scores.
      report() {
        const body = request('GET', `/api/v1/eval/experiments/${encodedExperiment}/report`);
        const scores = listScores(experimentId);
        const decided = scores.filter((s) => s.passed !== null && s.passed !== undefined);
        const passed = decided.filter((s) => s.passed).length;
        return {
          summary: body.summary || {},
          rows: body.rows || [],
          scores,
          verdictPassRate: decided.length ? passed / decided.length : null,
          failing: decided.filter((s) => !s.passed),
        };
      },
    };
  }

  return {
    listCases,
    listScores,
    findConversationByTitle,
    experiment,

    createExperiment({ id, name, suiteId, suiteVersion, candidate, tags, plannedTrialCount }) {
      const experimentId = id || `exp_k6_${Date.now()}`;
      request('POST', '/api/v1/experiment-runs:upsert', {
        experiment_id: experimentId,
        name: name || 'k6 agent eval',
        ...(suiteId ? { suite_id: suiteId, suite_version: suiteVersion || 'v1' } : {}),
        ...(candidate ? { candidate } : {}),
        ...(tags ? { tags } : {}),
        ...(plannedTrialCount !== undefined ? { planned_trial_count: plannedTrialCount } : {}),
      });
      return experiment(experimentId);
    },
  };
}
