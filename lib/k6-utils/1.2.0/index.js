export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function randomIntBetween(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randomItem(arrayOfItems){
  return arrayOfItems[Math.floor(Math.random() * arrayOfItems.length)];
}

export function randomString(length, charset='abcdefghijklmnopqrstuvwxyz') {
  let res = '';
  while (length--) res += charset[(Math.random() * charset.length) | 0];
  return res;
}

export function findBetween(content, left, right, repeat = false) {
  const extracted = [];
  let doSearch = true;
  let start, end = 0;
  
  while (doSearch) {
    start = content.indexOf(left);
    if (start == -1) {
      break; // no more matches
    }

    start += left.length;
    end = content.indexOf(right, start);
    if (end == -1) {
      break; // no more matches
    }
    let extractedContent = content.substring(start, end);

    // stop here if only extracting one match (default behavior)
    if (!repeat) {
      return extractedContent; 
    }

    // otherwise, add it to the array
    extracted.push(extractedContent);
    
    // update the "cursor" position to the end of the previous match
    content = content.substring(end + right.length);
  }

  return extracted.length ? extracted : null; // return all matches as an array or null
}

export function normalDistributionStages(maxVus, durationSeconds, numberOfStages=10) {
  function normalDensity(mean, scale, x) {
    return Math.exp(-1 / 2 * Math.pow((x - mean) / scale, 2)) / (scale * Math.sqrt(2 * Math.PI));
  }

  const mean = 0;
  const scale = 1;
  let curve = new Array(numberOfStages + 2).fill(0);
  let durations = new Array(numberOfStages + 2).fill(Math.ceil(durationSeconds / 6));
  let k6stages = [];

  for (let i = 0; i <= numberOfStages; i++) {
    curve[i] = normalDensity(mean, scale, -2 * scale + 4 * scale * i / numberOfStages);
  }

  let peakDistribution = Math.max(...curve);

  let vus = curve.map(x => Math.round(x * maxVus / peakDistribution));

  for (let j = 1; j <= numberOfStages; j++) {
    durations[j] = Math.ceil(4 * durationSeconds / (6 * numberOfStages));
  }

  for (let k = 0; k <= numberOfStages + 1; k++) {
    k6stages.push({duration: `${durations[k]}s`, target: vus[k]});
  }

  return k6stages;
}
