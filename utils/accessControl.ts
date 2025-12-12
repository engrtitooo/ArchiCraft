
// This file stores Base64 encoded versions of the allowed access codes.
// This ensures universal browser compatibility (no crypto.subtle dependency)
// while keeping the actual codes obfuscated in the source.

const ALLOWED_CODES_B64 = [
  "QVJDSEktTUFTVEVSLURFVg==", // ARCHI-MASTER-DEV
  "SlVER0UtUEFTUy0wMQ==",      // JUDGE-PASS-01
  "SlVER0UtUEFTUy0wMg==",      // JUDGE-PASS-02
  "SlVER0UtUEFTUy0wMw==",      // JUDGE-PASS-03
  "SlVER0UtUEFTUy0wNA==",      // JUDGE-PASS-04
  "SlVER0UtUEFTUy0wNQ==",      // JUDGE-PASS-05
  "SlVER0UtUEFTUy0wNg==",      // JUDGE-PASS-06
  "SlVER0UtUEFTUy0wNw==",      // JUDGE-PASS-07
  "SlVER0UtUEFTUy0wOA==",      // JUDGE-PASS-08
  "SlVER0UtUEFTUy0wOQ==",      // JUDGE-PASS-09
  "SlVER0UtUEFTUy0xMA=="       // JUDGE-PASS-10
];

export const checkAccessCode = async (inputCode: string): Promise<boolean> => {
  // Simulate a brief async delay for UI consistency and brute-force deterrence
  await new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    if (!inputCode) return false;
    // Normalize input: trim whitespace and convert to uppercase
    const normalized = inputCode.trim().toUpperCase();
    // Encode to Base64
    const encoded = btoa(normalized);
    
    return ALLOWED_CODES_B64.includes(encoded);
  } catch (e) {
    console.error("Access verification failed:", e);
    return false;
  }
};

export const isSessionUnlocked = (): boolean => {
  try {
    return sessionStorage.getItem('archi_access_unlocked') === 'true';
  } catch (e) {
    return false;
  }
};

export const setSessionUnlocked = () => {
  try {
    sessionStorage.setItem('archi_access_unlocked', 'true');
  } catch (e) {
    console.error("Failed to save session state", e);
  }
};
