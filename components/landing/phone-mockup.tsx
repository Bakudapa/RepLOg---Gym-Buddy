type LoggedSet = { weight: string; reps: number; pr?: boolean };
type LoggedExercise = { name: string; sets: LoggedSet[] };

const workout: LoggedExercise[] = [
  {
    name: "Bench Press",
    sets: [
      { weight: "60", reps: 10 },
      { weight: "80", reps: 8 },
      { weight: "80", reps: 8 },
      { weight: "82.5", reps: 6, pr: true },
    ],
  },
  {
    name: "Overhead Press",
    sets: [
      { weight: "45", reps: 8 },
      { weight: "45", reps: 8 },
      { weight: "47.5", reps: 6 },
    ],
  },
  {
    name: "Incline Dumbbell Press",
    sets: [
      { weight: "26", reps: 10 },
      { weight: "26", reps: 9 },
    ],
  },
];

/** A plain phone frame with a workout log, drawn with HTML only (FR2, NFR8). */
export function PhoneMockup() {
  return (
    <figure
      className="mx-auto w-full max-w-[340px] md:max-w-[460px] lg:mr-0 lg:max-w-[380px]"
      aria-label="Preview of a workout logged in RepLog"
    >
      <div className="rounded-lg border border-line-strong bg-surface p-2.5">
        <div className="rounded-md border border-line bg-bg" aria-hidden="true">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold">Push day</span>
            <span className="num text-xs text-muted">Tue 28 Oct</span>
          </div>

          <div className="divide-y divide-line">
            {workout.map((exercise) => (
              <div key={exercise.name} className="px-4 py-3">
                <p className="text-sm font-medium">{exercise.name}</p>
                <div className="num mt-2 grid grid-cols-[2rem_1fr_auto] gap-y-1 text-xs text-muted">
                  <span>SET</span>
                  <span>KG × REPS</span>
                  <span />
                  {exercise.sets.map((set, index) => (
                    <SetRow key={index} index={index + 1} set={set} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <span className="text-xs text-muted">
              Rest <span className="num text-sm text-fg">1:30</span>
            </span>
            <span className="rounded-sm border border-line-strong px-2 py-1 text-xs font-medium">
              Add set
            </span>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        A logged push day: bench press up to 82.5 kg for 6 reps, marked as a personal
        record.
      </figcaption>
    </figure>
  );
}

function SetRow({ index, set }: { index: number; set: LoggedSet }) {
  return (
    <>
      <span>{index}</span>
      <span className="text-sm text-fg">
        {set.weight} × {set.reps}
      </span>
      <span className="justify-self-end">
        {set.pr ? (
          <span className="rounded-sm border border-fg px-1.5 font-sans text-xs font-semibold text-fg">
            PR
          </span>
        ) : null}
      </span>
    </>
  );
}
