const SettingsPage = () => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure your DraftGuard preferences.</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Tone */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground">Default Tone</h3>
          <p className="mt-1 text-sm text-muted-foreground">Set the default tone for generated emails.</p>
          <div className="mt-4 flex gap-3">
            {["Professional", "Friendly", "Direct"].map((tone) => (
              <button
                key={tone}
                className="rounded-lg border border-border bg-accent px-4 py-2 text-sm font-medium text-foreground transition-colors first:border-primary first:bg-primary/5 hover:border-primary/30"
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground">Outreach Goal</h3>
          <p className="mt-1 text-sm text-muted-foreground">What are you using DraftGuard for?</p>
          <div className="mt-4 flex gap-3">
            {["Sales outreach", "Partnerships", "Recruiting"].map((goal) => (
              <button
                key={goal}
                className="rounded-lg border border-border bg-accent px-4 py-2 text-sm font-medium text-foreground transition-colors first:border-primary first:bg-primary/5 hover:border-primary/30"
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-send threshold */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground">Auto-send Threshold</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Automatically send emails above this confidence score. Set to 100 to disable.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <input
              type="range"
              min={50}
              max={100}
              defaultValue={90}
              className="h-2 w-64 cursor-pointer appearance-none rounded-full bg-border accent-primary"
            />
            <span className="font-heading text-lg font-bold text-foreground">90</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
