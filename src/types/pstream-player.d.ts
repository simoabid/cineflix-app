declare module "fscreen" {
  const fscreen: {
    fullscreenElement: Element | null;
    fullscreenEnabled: boolean;
    requestFullscreen(element: Element): Promise<void> | void;
    exitFullscreen(): Promise<void> | void;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  };

  export default fscreen;
}

declare module "@ladjs/country-language" {
  export interface LanguageObj {
    iso639_1: string;
    countries: Array<{
      code_2: string;
      code_3: string;
    }>;
    direction: "LTR" | "RTL";
    name: string[];
    nativeName: string[];
  }

  const countryLanguages: {
    getLanguage(
      code: string,
      callback: (error: Error | null, language?: LanguageObj) => void,
    ): void;
  };

  export default countryLanguages;
}
