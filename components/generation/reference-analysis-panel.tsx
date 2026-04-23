"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { ReferenceAnalysis } from "@/types/domain";

const orderedFields: Array<{ key: keyof ReferenceAnalysis; labelEs: string; labelEn: string }> = [
  { key: "shotType", labelEs: "Tipo de plano", labelEn: "Shot type" },
  { key: "cameraAngle", labelEs: "Angulo de camara", labelEn: "Camera angle" },
  { key: "composition", labelEs: "Composicion", labelEn: "Composition" },
  { key: "poseDescription", labelEs: "Pose", labelEn: "Pose" },
  { key: "facialExpression", labelEs: "Expresion facial", labelEn: "Facial expression" },
  { key: "gazeDirection", labelEs: "Direccion de mirada", labelEn: "Gaze direction" },
  { key: "lighting", labelEs: "Iluminacion", labelEn: "Lighting" },
  { key: "environment", labelEs: "Entorno", labelEn: "Environment" },
  { key: "wardrobe", labelEs: "Vestuario", labelEn: "Wardrobe" },
  { key: "colorPalette", labelEs: "Paleta", labelEn: "Color palette" },
  { key: "mood", labelEs: "Mood", labelEn: "Mood" },
  { key: "realismLevel", labelEs: "Nivel de realismo", labelEn: "Realism level" },
  { key: "importantDoNotChangeElements", labelEs: "No cambiar", labelEn: "Do not change" },
  { key: "backgroundDescription", labelEs: "Fondo", labelEn: "Background" },
  { key: "bodyVisibility", labelEs: "Visibilidad del cuerpo", labelEn: "Body visibility" },
  { key: "styleKeywords", labelEs: "Keywords de estilo", labelEn: "Style keywords" },
  { key: "subjectCount", labelEs: "Cantidad de sujetos", labelEn: "Subject count" },
  { key: "singlePersonClear", labelEs: "Persona unica clara", labelEn: "Single person clear" },
  { key: "primaryFaceVisible", labelEs: "Rostro principal visible", labelEn: "Primary face visible" },
  { key: "heldObjects", labelEs: "Objetos en mano", labelEn: "Held objects" },
  { key: "compositionLockNotes", labelEs: "Notas de bloqueo", labelEn: "Composition lock notes" },
  { key: "referenceQuality", labelEs: "Calidad de referencia", labelEn: "Reference quality" },
];

function formatValue(value: string | string[] | number | boolean) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function ReferenceAnalysisPanel({ analysis }: { analysis: ReferenceAnalysis | null }) {
  const { t, locale } = useAppPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("generation.analysisPanelTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {analysis ? (
          <div className="space-y-2">
            {orderedFields.map((field) => (
              <div key={field.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  {locale === "es" ? field.labelEs : field.labelEn}
                </p>
                <p className="text-sm text-[var(--foreground)]">{formatValue(analysis[field.key])}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">{t("generation.uploadReferenceForAnalysis")}</p>
        )}
      </CardContent>
    </Card>
  );
}
