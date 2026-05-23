import { useMemo, useState } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { ScrapeExplorer } from "@/components/ScrapeExplorer";
import { SubmissionMilestones } from "@/components/SubmissionMilestones";
import { Sidebar } from "@/components/Sidebar";
import { TaskDetail } from "@/components/TaskDetail";
import { TaskList } from "@/components/TaskList";
import { pebbleWorkbookUrl, requirements, workflowOrder } from "@/data/requirements";
import { useProgress } from "@/hooks/useProgress";
import { useUnifiedScrape } from "@/hooks/useUnifiedScrape";
import type { RequirementCategory } from "@/types";

type ViewCategory = RequirementCategory | "all" | "workflow";

export default function App() {
  const [view, setView] = useState<ViewCategory>("workflow");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    workflowOrder[0] ?? requirements[0]?.id ?? null,
  );
  const [libraryPageName, setLibraryPageName] = useState<string | null>(null);

  const {
    state,
    setTaskStatus,
    toggleChecklist,
    setNote,
    resetProgress,
    githubUser,
    gistUrl,
    syncStatus,
    syncError,
    isCloudEnabled,
    signInWithGitHub,
    signOut,
  } = useProgress();

  const { data: unifiedScrape, findPage: findUnifiedPage } = useUnifiedScrape();

  const visibleTasks = useMemo(() => {
    if (view === "workflow") {
      return workflowOrder
        .map((id) => requirements.find((t) => t.id === id))
        .filter(Boolean) as typeof requirements;
    }
    if (view === "all") return requirements;
    return requirements.filter((t) => t.category === view);
  }, [view]);

  const selectedTask = requirements.find((t) => t.id === selectedTaskId) ?? null;
  const unifiedPage = selectedTask
    ? findUnifiedPage(selectedTask.pebblePage)
    : libraryPageName
      ? unifiedScrape?.pagesByName[libraryPageName] ?? null
      : null;

  const selectTask = (id: string) => {
    setSelectedTaskId(id);
    setLibraryPageName(null);
  };

  const selectCategory = (c: ViewCategory) => {
    setView(c);
    setLibraryPageName(null);
    if (c === "workflow") {
      setSelectedTaskId(workflowOrder[0] ?? null);
    } else if (c !== "all") {
      const first = requirements.find((t) => t.category === c);
      if (first) setSelectedTaskId(first.id);
    }
  };

  const selectLibraryPage = (pageName: string) => {
    setLibraryPageName(pageName);
    const match = requirements.find(
      (t) =>
        t.pebblePage === pageName ||
        t.pebblePage?.toLowerCase().replace(/-/g, " ") ===
          pageName.toLowerCase().replace(/-/g, " "),
    );
    if (match) setSelectedTaskId(match.id);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <Sidebar
        activeCategory={view}
        activeTaskId={selectedTaskId}
        onSelectCategory={selectCategory}
        onSelectTask={(id) => {
          selectTask(id);
          const task = requirements.find((t) => t.id === id);
          if (task && view !== "all" && view !== "workflow") {
            setView(task.category);
          }
        }}
        state={state}
        scrapeMeta={unifiedScrape}
        selectedLibraryPageName={libraryPageName ?? selectedTask?.pebblePage ?? null}
        onSelectLibraryPage={selectLibraryPage}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar
          view={view}
          tasks={visibleTasks}
          allTasks={requirements}
          state={state}
          unifiedScrape={unifiedScrape}
          pebbleUrl={pebbleWorkbookUrl}
          onReset={resetProgress}
          isCloudEnabled={isCloudEnabled}
          githubUser={githubUser}
          gistUrl={gistUrl}
          syncStatus={syncStatus}
          syncError={syncError}
          onSignIn={signInWithGitHub}
          onSignOut={signOut}
        />

        <div className="flex min-h-0 flex-1">
          <div className="flex w-[min(100%,380px)] shrink-0 flex-col border-r border-[var(--color-border)] bg-[#0c0c0e]">
            <SubmissionMilestones
              checklist={state.checklist}
              onToggle={toggleChecklist}
              onJumpToTask={selectTask}
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TaskList
                tasks={visibleTasks}
                state={state}
                selectedId={selectedTaskId}
                onSelect={selectTask}
                groupByCategory={view === "all"}
                showIndex={view === "workflow"}
              />
            </div>
          </div>

          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl px-6 py-6 lg:max-w-3xl lg:px-8 lg:py-8">
              {selectedTask ? (
                <TaskDetail
                  task={selectedTask}
                  state={state}
                  unifiedPage={unifiedPage}
                  scrapeMeta={unifiedScrape}
                  onStatusChange={(s) => setTaskStatus(selectedTask.id, s)}
                  onToggleChecklist={toggleChecklist}
                  onNoteChange={(n) => setNote(selectedTask.id, n)}
                />
              ) : libraryPageName ? (
                <div>
                  <h2 className="text-xl font-semibold">{libraryPageName}</h2>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    Scrape library — no curated task linked
                  </p>
                  <div className="mt-6">
                    <ScrapeExplorer
                      page={unifiedPage}
                      scrapeMeta={unifiedScrape}
                      pebblePageLabel={libraryPageName}
                    />
                  </div>
                </div>
              ) : (
                <EmptyDetail />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-lg font-semibold text-[#a8b0ff]">
        IP
      </div>
      <p className="mt-4 text-sm font-medium">Select a requirement</p>
      <p className="mt-1 max-w-xs text-xs text-[var(--color-muted-foreground)]">
        Choose a task or pick a page from the Scrape library to view readable text,
        HTML, linked documents, and walk excerpts together.
      </p>
    </div>
  );
}
