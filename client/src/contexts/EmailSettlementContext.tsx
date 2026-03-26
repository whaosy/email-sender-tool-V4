import { createContext, useContext, useState, ReactNode } from 'react';

interface EmailSettlementState {
  uploadedFile: any;
  selectedTemplate: any;
  selectedSmtpConfig: any;
  mappingFile?: any;
  settlementType: 'bySheet' | 'byRow';
  dataClassificationColumn: string; // 数据分类列名
}

interface EmailSettlementContextType {
  state: EmailSettlementState;
  setUploadedFile: (file: any) => void;
  setSelectedTemplate: (template: any) => void;
  setSelectedSmtpConfig: (config: any) => void;
  setMappingFile: (file: any) => void;
  setSettlementType: (type: 'bySheet' | 'byRow') => void;
  setDataClassificationColumn: (column: string) => void;
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
    dataClassificationColumn: '商户名称',
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

  const setDataClassificationColumn = (column: string) => {
    setState((prev) => ({ ...prev, dataClassificationColumn: column }));
  };

  const reset = () => {
    setState({
      uploadedFile: null,
      selectedTemplate: null,
      selectedSmtpConfig: null,
      mappingFile: undefined,
      settlementType: 'bySheet',
      dataClassificationColumn: '商户名称',
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
        setDataClassificationColumn,
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
