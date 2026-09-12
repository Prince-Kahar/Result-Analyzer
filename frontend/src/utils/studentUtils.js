/**
 * Cleans student name by stripping trailing course names, academic branches,
 * semester tags, or evaluation categories (e.g. M.SC., B.SC., BCA, (I.T.), CBCS, etc.)
 */
export function cleanStudentName(rawName) {
  if (!rawName) return 'Student';
  let name = String(rawName).trim();
  
  const coursePatterns = [
    /\s+(?:M\.?\s*SC\.?|B\.?\s*SC\.?|BCA|MCA|BBA|MBA|B\.?\s*COM\.?|M\.?\s*COM\.?)(?:\s*\(?[^)]*\)?)?.*$/i,
    /\s+(?:BACHELOR|MASTER|DIPLOMA)\s+OF\s+.*$/i,
    /\s+\(?(?:I\.?\s*T\.?|DATA\s+SCIENCE|COMPUTER\s+APP[A-Z]*)\)?.*$/i,
    /\s+(?:NCF-NEP|CBCS|NEP|\d{4}-\d{2,4}).*$/i,
    /\s+(?:WHOLE|PART|REGULAR|EXTERNAL)\s*$/i
  ];

  for (const pattern of coursePatterns) {
    name = name.replace(pattern, '').trim();
  }

  return name.replace(/[\s.,\-_/]+$/, '').trim();
}
