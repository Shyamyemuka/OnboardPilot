"use client";

interface StarterTaskItem {
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  files: string[];
  description: string;
}

interface StarterTasksProps {
  tasks: StarterTaskItem[];
  onGenerateBlueprint?: (task: StarterTaskItem) => void;
}

export default function StarterTasks({ tasks, onGenerateBlueprint }: StarterTasksProps) {
  if (!tasks || tasks.length === 0) {
    return <p className="text-text-muted text-sm italic">No starter tasks suggested.</p>;
  }

  const getDifficultyStyles = (diff: string) => {
    switch (diff?.toLowerCase()) {
      case "beginner":
        return {
          bg: "bg-[#FCDEB5]/40 text-[#271901]",
          label: "Good First Issue",
          hours: "2 hrs est.",
        };
      case "intermediate":
        return {
          bg: "bg-[#DEC29A]/40 text-[#574325]",
          label: "Intermediate",
          hours: "6 hrs est.",
        };
      case "advanced":
        return {
          bg: "bg-error-container/60 text-on-error-container",
          label: "Advanced Task",
          hours: "15 hrs est.",
        };
      default:
        return {
          bg: "bg-surface-container-high text-on-surface-variant",
          label: "General Task",
          hours: "4 hrs est.",
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tasks.map((task, idx) => {
        const styles = getDifficultyStyles(task.difficulty);

        return (
          <div
            key={idx}
            className="p-4 border border-border-subtle rounded-lg bg-surface-white hover:border-outline-variant transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-2 gap-2">
                <h3 className="font-semibold text-body-md text-on-surface group-hover:text-secondary transition-colors line-clamp-2">
                  {task.title}
                </h3>
                <span
                  className={`${styles.bg} px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider whitespace-nowrap shrink-0`}
                >
                  {styles.label}
                </span>
              </div>
              <p className="text-text-muted text-xs mb-4 leading-relaxed line-clamp-3">
                {task.description}
              </p>
            </div>

            <div>
              {task.files && task.files.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-on-surface-variant font-medium">Files:</span>
                  {task.files.slice(0, 3).map((file, fIdx) => (
                    <span
                      key={fIdx}
                      className="font-mono-code text-[10px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant max-w-[120px] truncate"
                      title={file}
                    >
                      {file.split("/").pop()}
                    </span>
                  ))}
                  {task.files.length > 3 && (
                    <span className="text-[10px] text-text-muted">+{task.files.length - 3} more</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-text-muted mt-auto pt-2 border-t border-surface-variant/40">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  {styles.hours}
                </span>
                {onGenerateBlueprint && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onGenerateBlueprint(task);
                    }}
                    className="flex items-center gap-1 text-[#574325] hover:text-primary transition-colors cursor-pointer font-bold"
                  >
                    <span className="material-symbols-outlined text-[14px]">difference</span>
                    Generate Blueprint
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
