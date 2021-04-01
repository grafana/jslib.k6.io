import http from "k6/http";
import { signWithHeaders } from "./header.js";

export default function () {
  var region = "us-east-1";
  var keyname = "test"
  var body = `{"SecretId": "${keyname}"}`
  var obj = signWithHeaders("POST", "secretsmanager", region, "secretsmanager.GetSecretValue", "", body, "", {
    "Content-Type": "application/x-amz-json-1.1",
  })
  var res = http.request("POST", "http://172.18.0.2:4566", body, { headers: obj.headers });

  console.log(JSON.stringify(res, null, "  "));
}
