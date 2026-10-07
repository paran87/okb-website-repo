/** localStorage key of the theme the visitor picked (next-themes). */
export const THEME_STORAGE_KEY = "theme";

/**
 * Runs in <head> before next-themes reads the stored theme: a new visit (a new tab or window opening the
 * site) forgets the theme picked on an earlier visit, so every visit starts dark. Within the visit the
 * picked theme stays across pages and reloads (sessionStorage marks the visit).
 */
export const DARK_ON_NEW_VISIT_SCRIPT = `try{if(!sessionStorage.getItem("okb-visit")){localStorage.removeItem(${JSON.stringify(THEME_STORAGE_KEY)});sessionStorage.setItem("okb-visit","1")}}catch(e){}`;
