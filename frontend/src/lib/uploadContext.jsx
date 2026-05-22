import { createContext, useContext, useState, useCallback } from 'react';

const UploadCtx = createContext(null);

export function UploadProvider({ children }) {
  // Map of assessmentId -> boolean (has at least one valid upload)
  const [uploadMap, setUploadMap] = useState({});

  const setHasUpload = useCallback((assessmentId, value) => {
    setUploadMap((prev) => ({ ...prev, [assessmentId]: !!value }));
  }, []);

  const hasUpload = useCallback(
    (assessmentId) => !!uploadMap[assessmentId],
    [uploadMap]
  );

  return (
    <UploadCtx.Provider value={{ hasUpload, setHasUpload }}>
      {children}
    </UploadCtx.Provider>
  );
}

export const useUpload = () => useContext(UploadCtx);
