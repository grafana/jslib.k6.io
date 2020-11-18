import http from "k6/http";
import { request } from "./core.js";
export let options = {
    "hosts": {
        "secretsmanager.us-east-1.amazonaws.com": "172.18.0.2:4566",
    },
}

export default function () {
    var region = "us-east-1";
    var keyname = "test"
    var body = `{"SecretId": "${keyname}"}`
    var res = request("POST", "secretsmanager", region, "secretsmanager.GetSecretValue", "",  body, "", {
        headers: {
            "X-Amz-Target": "secretsmanager.GetSecretValue",
            "Content-Type": "application/x-amz-json-1.1",
            "Host": "172.18.0.2:4566",
        },
    })

    console.log(JSON.stringify(res, null, "  "));
}
