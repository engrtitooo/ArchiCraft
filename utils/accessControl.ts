
// This file stores SHA-256 hashes of the allowed access codes.
// The actual codes are NOT stored here, making it safe to commit this file.

// Hashes for: JUDGE-PASS-01 to JUDGE-PASS-10 and ARCHI-MASTER-DEV
const ALLOWED_HASHES = [
  "982d338b776c59918df9df845014389e80ba0870940428d0674ba07865f14e21", // JUDGE-PASS-01
  "561334e320d7509f6e52292dc2288009b02a909477ba6138c205370d740c5717", // JUDGE-PASS-02
  "c63b4923e3e099689e4722884c7185038b32ba3df1d9d53c3014168c4d2919d3", // JUDGE-PASS-03
  "1400d3d528b9d5b7804471691384061a525f2692298e16999249e083921204d6", // JUDGE-PASS-04
  "342211516086f685c8849b222955f11053457a448408434a36f6804a29a0f443", // JUDGE-PASS-05
  "b86561f3801f95d82046808794d0728340d862804369e0689b6574f268f86f76", // JUDGE-PASS-06
  "39446777a49622d1746c188b48f579979d5718df8236d6a6217637841961ce97", // JUDGE-PASS-07
  "6620593b4f53513a967f6071421f58999925232d3027b4618e00d749962e7425", // JUDGE-PASS-08
  "52b4152567634351662c667083161c36082d627c2825028022b724b10b036577", // JUDGE-PASS-09
  "17c8286a01497914041d575486820c78a101211246c071720a2046603774883f", // JUDGE-PASS-10
  "76495208f0293126f55562d9894676527964b4239855b7a0d4b998ba97793540"  // ARCHI-MASTER-DEV
];

export const checkAccessCode = async (inputCode: string): Promise<boolean> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(inputCode.trim());
  
  // Use browser native crypto API for security
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return ALLOWED_HASHES.includes(hashHex);
};

export const isSessionUnlocked = (): boolean => {
  return sessionStorage.getItem('archi_access_unlocked') === 'true';
};

export const setSessionUnlocked = () => {
  sessionStorage.setItem('archi_access_unlocked', 'true');
};
