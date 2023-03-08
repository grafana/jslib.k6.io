import http from 'k6/http';
import { sleep } from 'k6';

export class Client {
    constructor(accessKey = (__ENV.STEADYBIT_ACCESS_KEY || __ENV.STEADYBIT_TOKEN), platformUrl = 'https://platform.steadybit.io') {
        this.platformUrl = platformUrl;
        this.headers = {
            'Authorization': `accessToken ${accessKey}`,
            'Accept': 'application/json',
            'User-Agent': 'steadybit/k6'
        };
    }

    start(experimentKey, allowParallel = false) {
        const response = http.post(`${this.platformUrl}/api/experiments/${experimentKey}/execute?allowParallel=${allowParallel}`, null, { headers: this.headers, tags: {} });
        if (response.status === 201) {
            let execution = response.headers['Location'];
            this.verifyRunning(execution);
            return execution;
        } else {
            const title = response.json('title');
            if (title) {
                throw new Error(title);
            } else {
                throw new Error(`Unexpected response status: ${response.status}`);
            }
        }
    }

    cancel(executionUrl) {
        const response = http.delete(executionUrl, { headers: this.headers });
        if (response.status !== 200) {
            throw new Error(`Unexpected response status: ${response.status}`);
        }
    }

    verifyCompleted(executionUrl, timeout = 60) {
        const state = this.waitForEnd(executionUrl, timeout);
        if (state !== 'COMPLETED') {
            throw new Error(`Execution did not complete within ${timeout}s. State: ${state}`);
        }
    }

    verifyRunning(executionUrl, timeout = 60) {
        const state = this.waitForState(executionUrl, timeout, 'RUNNING', 'COMPLETED', 'CANCELED', 'FAILED');
        if (state !== 'RUNNING') {
            throw new Error(`Execution did not start within ${timeout}s. State: ${state}`);
        }
    }

    waitForEnd(executionUrl, timeout = 60) {
        return this.waitForState(executionUrl, timeout, 'COMPLETED', 'CANCELED', 'FAILED');
    }

    waitForState(executionUrl, timeout, ...states) {
        const deadline = new Date().getTime() + (timeout * 1000);
        let state = 'UNKNOWN';
        while (new Date().getTime() < deadline && !states.includes(state)) {
            state = this.getState(executionUrl);
            sleep(1)
        }
        return state;
    }

    getState(executionUrl) {
        const response = http.get(executionUrl, { headers: this.headers });
        if (response.status === 200) {
            return response.json('state');
        } else {
            throw new Error(`Unexpected response status: ${response.status}`);
        }
    }
}

export default new Client();
