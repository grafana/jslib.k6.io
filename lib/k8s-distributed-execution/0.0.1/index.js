export function getExecutionSegments(
  n = __ENV.K6_INSTANCES_INDEX,
  s = __ENV.K6_INSTANCES_TOTAL
) {
  if (n > s) {
    throw new Error('Instance index is greater than the total');
  }

  let sequence = [];
  for (let i = 0; i <= s; i++) {
    sequence.push(`${i}/${s}`);
  }

  return {
    executionSegment: `${n - 1}/${s}:${n}/${s}`,
    executionSegmentSequence: sequence.join(','),
  };
}

export function logSegment() {
  console.log('---');
  console.log(`Pod Index: ${__ENV.K6_INSTANCES_INDEX}`);
  console.log(`Execution Segment: ${getExecutionSegments().executionSegment}`);
  console.log('---');
}
