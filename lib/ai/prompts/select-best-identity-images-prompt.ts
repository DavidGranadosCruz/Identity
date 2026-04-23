interface CandidateImage {
  id: string;
  score: number;
  identityConsistencyScore: number;
  isIdentityValid: boolean;
  tags: string[];
  warnings: string[];
}

export function selectBestIdentityImagesPrompt(referenceSummary: string, candidates: CandidateImage[]) {
  return `
You are selecting identity photos for strict identity-preserving recreation.
Prioritize identity consistency first, then technical quality.

Reference summary:
${referenceSummary}

Candidates:
${JSON.stringify(candidates, null, 2)}

Return ONLY valid JSON:
{
  "selectedImageIds": ["id1", "id2"],
  "rationale": "short explanation",
  "rejectedImageReasons": [{"imageId":"id3","reason":"why rejected"}]
}

Rules:
- Never select images where isIdentityValid is false unless there are no alternatives.
- Prefer high identityConsistencyScore + high quality score.
- Avoid duplicates and near-identical poses.
- Avoid cutouts, watermark-heavy, blurred, extreme profile photos.
- Select 4 to 8 images when possible.
`;
}