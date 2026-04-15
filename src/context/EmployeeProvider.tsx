import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { Employee } from '../types/hrms.types';

interface EmployeeContextType {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  policyVersion: number;
  setPolicyVersion: React.Dispatch<React.SetStateAction<number>>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [policyVersion, setPolicyVersion] = useState<number>(1.0);

  const value = useMemo(() => ({
    employees,
    setEmployees,
    policyVersion,
    setPolicyVersion,
  }), [employees, policyVersion]);

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployee = () => {
  const context = useContext(EmployeeContext);
  if (!context) throw new Error('useEmployee must be used within EmployeeProvider');
  return context;
};
