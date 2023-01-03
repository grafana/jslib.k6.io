// Find and return the Turbo stream name
export function turboStreamName(doc) {
  let el = doc.find("turbo-cable-stream-source");
  if (!el) return;

  return el.attr("signed-stream-name");
}

// Find and return action-cable-url on the page
export function cableUrl(doc) {
  return fetchMeta(doc, 'name', 'action-cable-url')
}

// Find and return csrf-token on the page
export function csrfToken(doc) {
  return fetchMeta(doc, 'name', 'csrf-token')
}

// Find and return csrf-param on the page
export function csrfParam(doc) {
  return fetchMeta(doc, 'name', 'csrf-param')
}

// Find and return meta attributes' value
export function fetchMeta(doc, attr, attrVal, attrContent = 'content') {
  let el = doc.find(`meta[${attr.toString()}=${attrVal.toString()}]`)
  if (!el) return;

  return el.attr(attrContent.toString())
}
