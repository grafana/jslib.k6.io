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
//       const trial = exp.trial({ testCaseId: testCase.test_case_id });
//       const result = runMyAgent(testCase.input);              // your agent
//       trial.complete({ conversationId: result.conversationId });
//       trial.grade({ evaluatorId: __ENV.EVALUATOR_ID });        // or trial.score({...})
//     }
//   }
//
//   export function teardown({ experimentId }) {
//     evals.experiment(experimentId).finalize();
//   }
//
// Every call throws on a non-2xx response: a 401 read is otherwise indistinguishable from an
// empty suite, which is a painful way to spend an afternoon.

import http from 'k6/http';
import encoding from 'k6/encoding';
import { sleep } from 'k6';

// Only this score key produces a pass rate, pass@k or pass^k in the experiment report. Scores
// under any other key show up as breakdowns, so `grade()` mirrors the evaluator's verdict here.
const HEADLINE_SCORE_KEY = 'final';

export function client({ apiUrl, tenantId, token }) {
  if (!apiUrl || !tenantId || !token) {
    throw new Error('agento11y-evals: apiUrl, tenantId and token are required');
  }
  const base = apiUrl.replace(/\/+$/, '');
  const headers = {
    Authorization: `Basic ${encoding.b64encode(`${tenantId}:${token}`)}`,
    'Content-Type': 'application/json',
  };

  function request(method, path, body) {
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

  // An instrumented agent creates its own conversation id and does not return it, but it does set
  // the conversation title from the run name. Give each run a unique name and look it up here.
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

    function trial({ testCaseId, attempt, trialId }) {
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
        },

        // Your own verdict. Written under the headline key so it drives the report.
        score({ passed, value, explanation, evaluatorId, scoreKey }) {
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
            return { status, passed: null, value: null };
          }

          const scores = (request('GET', `/api/v1/eval/experiments/${encodedExperiment}/scores`).items || [])
            .filter((s) => s.trial_id === id && s.evaluator_id === evaluatorId);
          const verdict = scores[scores.length - 1];
          if (verdict && mirrorHeadline !== false && verdict.score_key !== HEADLINE_SCORE_KEY) {
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

    return {
      id: experimentId,
      trial,

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
        const scores = request('GET', `/api/v1/eval/experiments/${encodedExperiment}/scores`).items || [];
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
