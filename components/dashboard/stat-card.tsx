import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold capitalize text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-600">{hint}</p>
      </CardContent>
    </Card>
  );
}

