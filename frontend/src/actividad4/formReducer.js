/** Estado y transiciones de formulario, independientes de React para poder probarlos. */
export const initialFormState = {
  nombre: "",
  cantidad: "1",
  enviando: false,
  resultado: null,
  error: "",
};

export function formReducer(state, action) {
  switch (action.type) {
    case "CAMPO":
      if (!["nombre", "cantidad"].includes(action.campo)) return state;
      return { ...state, [action.campo]: action.valor, resultado: null, error: "" };
    case "ENVIANDO":
      return { ...state, enviando: true, resultado: null, error: "" };
    case "EXITO":
      return { ...state, enviando: false, resultado: action.resultado, error: "" };
    case "ERROR":
      return { ...state, enviando: false, resultado: null, error: action.mensaje };
    case "REINICIAR":
      return { ...initialFormState };
    default:
      return state;
  }
}
