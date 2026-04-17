import type { ToolInfo } from "@/lib/types";

export function ToolCard({ tool }: { tool: ToolInfo }) {
  const schema = tool.inputSchema;
  const properties =
    (schema.properties as Record<string, Record<string, unknown>>) || {};
  const propNames = Object.keys(properties);
  const required = (schema.required as string[]) || [];

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <h4 className="font-mono text-sm font-semibold text-[var(--color-accent)]">
        {tool.name}
      </h4>
      {tool.description && (
        <p className="mt-1 text-xs text-[var(--color-text-dim)]">
          {tool.description}
        </p>
      )}
      {propNames.length > 0 && (
        <div className="mt-2 text-xs">
          <span className="text-[var(--color-text-dim)]">Parameters: </span>
          {propNames.map((name) => (
            <span
              key={name}
              className={`inline-block mr-1.5 px-1.5 py-0.5 rounded font-mono ${
                required.includes(name)
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                  : "bg-[var(--color-border)] text-[var(--color-text-dim)]"
              }`}
            >
              {name}
              {required.includes(name) && "*"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
