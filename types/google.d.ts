// Global type declaration for Google Identity Services (GSI) SDK
// This avoids duplicate declarations across login/register pages

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: string;
              size?: string;
              width?: number;
              shape?: string;
              text?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export {};
