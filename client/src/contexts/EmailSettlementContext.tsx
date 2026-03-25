import { createContext, useContext, useState, ReactNode } from 'react';

interface EmailSettlementState {
  uploadedFile: any;
  selectedTemplate: any;
  selectedSmtpConfig: any;
  mappingFile?: any;
  settlementType: 'bySheet' | 'byRow';
}

interface EmailSettlementContextType {
  state: EmailSettlementState;
  setUploadedFile: (file: any) => void;
  setSelectedTemplate: (template: any) => void;
  setSelectedSmtpConfig: (config: any) => void;
  setMappingFile: (file: any) => void;
  setSettlementType: (type: 'bySheet' | 'byRow') => void;
  reset: () => void;
}

const EmailSettlementContext = createContext<EmailSettlementContextType | undefined>(undefined);

export function EmailSettlementProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EmailSettlementState>({
    uploadedFile: null,
    selectedTemplate: null,
    selectedSmtpConfig: null,
    mappingFile: undefined,
    settlementType: 'bySheet',
  });

  const setUploadedFile = (file: any) => {
    setState((prev) => ({ ...prev, uploadedFile: file }));
  };

  const setSelectedTemplate = (template: any) => {
    setState((prev) => ({ ...prev, selectedTemplate: template }));
  };

  const setSelectedSmtpConfig = (config: any) => {
    setState((prev) => ({ ...prev, selectedSmtpConfig: config }));
  };

  const setMappingFile = (file: any) => {
    setState((prev) => ({ ...prev, mappingFile: file }));
  };

  const setSettlementType = (type: 'bySheet' | 'byRow') => {
    setState((prev) => ({ ...prev, settlementType: type }));
  };

  const reset = () => {
    setState({
      uploadedFile: null,
      selectedTemplate: null,
      selectedSmtpConfig: null,
      mappingFile: undefined,
      settlementType: 'bySheet',
    });
  };

  return (
    <EmailSettlementContext.Provider
      value={{
        state,
        setUploadedFile,
        setSelectedTemplate,
        setSelectedSmtpConfig,
        setMappingFile,
        setSettlementType,
        reset,
      }}
    >
      {children}
    </EmailSettlementContext.Provider>
  );
}

export function useEmailSettlement() {
  const context = useContext(EmailSettlementContext);
  if (!context) {
    throw new Error('useEmailSettlement must be used within EmailSettlementProvider');
  }
  return context;
}
