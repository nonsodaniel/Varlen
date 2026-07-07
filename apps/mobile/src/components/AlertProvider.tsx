import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CustomAlert, AlertConfig, AlertButton } from './ui/CustomAlert';

interface AlertContextValue {
  showAlert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { icon?: string; iconColor?: string },
  ) => void;
}

const AlertContext = createContext<AlertContextValue>({
  showAlert: () => {},
});

export function useAlert() {
  return useContext(AlertContext);
}

// Global reference for use outside React components (e.g., in stores)
let globalShowAlert: AlertContextValue['showAlert'] = () => {};

export function showGlobalAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { icon?: string; iconColor?: string },
) {
  globalShowAlert(title, message, buttons, options);
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const showAlert = useCallback<AlertContextValue['showAlert']>(
    (title, message, buttons, options) => {
      setConfig({
        title,
        message,
        buttons: buttons ?? [{ text: 'OK', style: 'default' }],
        icon: options?.icon,
        iconColor: options?.iconColor,
      });
      setVisible(true);
    },
    [],
  );

  // Register the global reference
  globalShowAlert = showAlert;

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert
        visible={visible}
        config={config}
        onDismiss={handleDismiss}
      />
    </AlertContext.Provider>
  );
}
