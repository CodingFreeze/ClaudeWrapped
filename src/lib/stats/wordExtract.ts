// ---------------------------------------------------------------------------
// Word extraction helpers — streaming accumulator-safe, no full text retained.
// ---------------------------------------------------------------------------

// Comprehensive English stop-word list + coding noise words.
// Length already >=4 filter is applied first, so words shorter than 4 chars
// never reach the stop-word check.
const STOP_WORDS = new Set([
  // Common English
  "the","and","that","with","this","from","have","will","would","could","should",
  "about","just","like","dont","cant","need","want","make","know","think","right",
  "really","actually","please","thanks","sure","okay","yeah","well","then","than",
  "when","what","where","which","there","their","your","youre","its","were","been",
  "being","some","more","most","very","much","many","also","only","them","they",
  "that","these","those","into","over","under","after","before","while","because",
  "though","still","even","back","down","here","work","etc","also","just","like",
  "does","doing","done","used","uses","made","makes","comes","going","come","went",
  "take","takes","took","give","gives","gave","keep","keeps","kept","help","helps",
  "helped","lets","let","try","tried","trying","seem","seems","seemed","feel","feels",
  "felt","look","looks","looked","find","finds","found","show","shows","showed",
  "might","shall","must","into","onto","upon","such","each","both","same","other",
  "another","different","next","last","first","second","third","small","large",
  "good","great","best","better","little","long","high","low","short","open",
  "close","closed","true","false","null","none","void","have","been","being",
  "every","always","never","often","again","away","tell","told","know","knew",
  "think","thought","want","wanted","make","made","need","needed","time","times",
  "things","thing","people","person","place","part","case","fact","question",
  "answer","point","idea","number","word","words","page","line","lines","type",
  "value","values","name","names","list","data","item","items","result","results",
  "example","examples","step","steps","section","sections","version","versions",
  // Coding noise words
  "file","code","line","error","test","run","build","using","add","fix","change",
  "update","check","look","see","get","set","new","now","this","that","with","from",
  "import","export","function","return","class","const","let","var","type","interface",
  "string","number","boolean","object","array","null","undefined","true","false",
  "index","path","directory","folder","package","module","library","framework",
  "component","props","state","hook","event","handler","callback","async","await",
  "promise","then","catch","finally","throw","error","throw","console","log","warn",
  "debug","info","output","input","param","params","argument","args","argv","argc",
]);

const WORD_CAP = 5000;

// Strip markdown code fences, inline code, URLs, punctuation, normalise to lowercase.
export function extractWords(text: string): string[] {
  // Remove code fences ```...```
  let clean = text.replace(/```[\s\S]*?```/g, " ");
  // Remove inline code `...`
  clean = clean.replace(/`[^`]*`/g, " ");
  // Remove URLs
  clean = clean.replace(/https?:\/\/\S+/g, " ");
  // Remove markdown headers/bullets
  clean = clean.replace(/^[#>*\-+]+\s*/gm, " ");
  // Remove punctuation except apostrophes (for contractions)
  clean = clean.replace(/[^a-zA-Z']+/g, " ");
  // Strip apostrophes (dont, cant, etc)
  clean = clean.replace(/'/g, "");

  return clean
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
}

/**
 * Accumulate word counts into a Map, capping at WORD_CAP distinct keys.
 * Existing keys keep incrementing even after cap; new keys are silently dropped.
 */
export function accumulateWords(map: Map<string, number>, words: string[]): void {
  for (const word of words) {
    const existing = map.get(word);
    if (existing !== undefined) {
      map.set(word, existing + 1);
    } else if (map.size < WORD_CAP) {
      map.set(word, 1);
    }
    // Past cap and new key: drop silently
  }
}

/** Return top-N entries from a word count Map, sorted by count descending. */
export function topWords(
  map: Map<string, number>,
  n: number,
): { word: string; count: number }[] {
  return [...map.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
