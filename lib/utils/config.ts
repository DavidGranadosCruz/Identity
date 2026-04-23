export const appConfig = {
  appName: "Identity",
  appDescription: "Identity-preserving photo recreation studio",
  accentColor: "#3B82F6",
  maxIdentityImages: 1000,
  minIdentityImages: 1,
  defaultReferenceFidelity: 80,
  defaultIdentityStrength: 80,
  legal: {
    ownershipNotice: "Solo sube fotos tuyas o para las que tengas consentimiento explicito.",
    misuseNotice: "El uso indebido, suplantacion o fraude esta prohibido.",
  },
} as const;

