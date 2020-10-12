
let crocodileAPIcontract = {
  type: "object",
  properties: {
    id: {
      type: "number"
    },
    name: {
      type: "string"
    },
    age: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },
    date_of_birth: {
      type: "string",
      format: "date"
    },
  },
  "required": [
    "name",
    "age",
    "date_of_birth",
  ]
};

let crocodileListAPIcontract = {
  "items": crocodileAPIcontract
};

export {
  crocodileAPIcontract,
  crocodileListAPIcontract,
}