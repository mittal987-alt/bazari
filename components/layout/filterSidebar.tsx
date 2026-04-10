"use client";

type Props = {
  category: string;
  setCategory: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
};

export default function FilterSidebar({
  category,
  setCategory,
  city,
  setCity,
}: Props) {
  return (
    <div className="border rounded-xl p-4 bg-white dark:bg-neutral-900 space-y-6">
      
      <div>
        <h3 className="font-semibold mb-2">Category</h3>
        {["electronics", "vehicles", "fashion", "property"].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`block w-full text-left px-3 py-2 rounded-lg transition
              ${
                category === c
                  ? "bg-blue-100 text-blue-600"
                  : "hover:bg-gray-100 dark:hover:bg-neutral-800"
              }
            `}
          >
            {c}
          </button>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-2">Location</h3>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Enter city"
        />
      </div>

    </div>
  );
}