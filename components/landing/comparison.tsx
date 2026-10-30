import { Check, Minus } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";

type Cell = true | false | string;

const columns = ["RepLog", "Notes app", "Spreadsheet", "Paper notebook"];

const rows: Array<{ label: string; values: [Cell, Cell, Cell, Cell] }> = [
  { label: "Automatic progress charts", values: [true, false, "Manual", false] },
  { label: "Rest timer", values: [true, false, false, false] },
  { label: "PR detection", values: [true, false, "Formulas", false] },
  { label: "Program templates", values: [true, false, "Manual", false] },
  { label: "Works offline", values: [true, true, "Depends", true] },
  { label: "Free", values: [true, true, true, true] },
];

function CellValue({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <>
        <Check aria-hidden size={18} className="inline-block" />
        <span className="sr-only">Yes</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus aria-hidden size={18} className="inline-block text-muted" />
        <span className="sr-only">No</span>
      </>
    );
  }
  return <span className="text-sm text-muted">{value}</span>;
}

export function Comparison() {
  return (
    <Section labelledBy="comparison-title">
      <SectionHeader
        id="comparison-title"
        label="Comparison"
        title="How it compares"
        description="What you get with RepLog next to the tools most lifters already use."
      />
      <div
        className="relative -mx-4 mt-12 overflow-x-auto overscroll-x-contain md:mx-0"
        role="region"
        aria-labelledby="comparison-title"
        tabIndex={0}
      >
        <table className="w-full min-w-[600px] border-collapse text-left md:min-w-0">
          <thead>
            <tr className="border-b border-line-strong">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-36 border-r border-line bg-bg py-3 pr-4 pl-4 text-sm font-medium text-muted md:static md:border-r-0 md:pl-0"
              >
                Feature
              </th>
              {columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={`px-3 py-3 text-center text-sm ${index === 0 ? "font-semibold" : "font-medium text-muted"}`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line">
                <th
                  scope="row"
                  className="sticky left-0 z-10 min-w-36 border-r border-line bg-bg py-4 pr-4 pl-4 text-base font-normal md:static md:border-r-0 md:pl-0"
                >
                  {row.label}
                </th>
                {row.values.map((value, index) => (
                  <td key={columns[index]} className="px-3 py-4 text-center">
                    <CellValue value={value} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
