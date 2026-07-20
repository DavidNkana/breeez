'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * Size guide with standard SA apparel/footwear sizing chart.
 * Shows a "Size guide" button that opens a modal with reference tables.
 *
 * For real product-level customization you'd store this in the DB keyed
 * by category — kept generic here for v1.
 */
export function SizeGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-brand-600 underline hover:text-brand-900"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 6h18M5 6v14h14V6M9 10v6M15 10v6" />
        </svg>
        Size guide
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          role="dialog"
          aria-label="Size guide"
          onClick={(e) => {
            if (e.currentTarget === e.target) setOpen(false);
          }}
        >
          <div className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-lg sm:rounded-lg bg-white shadow-xl">
            <div className="border-b border-brand-200 px-5 py-3">
              <h2 className="text-base font-semibold text-brand-950">Size guide</h2>
              <p className="text-xs text-brand-500">Standard SA measurements. When in doubt, size up.</p>
            </div>

            <div className="space-y-6 p-5">
              {/* Tops, shirts, jackets */}
              <div>
                <h3 className="text-sm font-semibold text-brand-900">Tops, shirts, jackets</h3>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-brand-50 text-brand-700">
                      <tr>
                        <th className="px-2 py-2 text-left">Size</th>
                        <th className="px-2 py-2">Chest (cm)</th>
                        <th className="px-2 py-2">Waist (cm)</th>
                        <th className="px-2 py-2">Length (cm)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-100 text-brand-800">
                      {[
                        ['XS', '82–86', '66–70', '66'],
                        ['S', '86–91', '70–74', '68'],
                        ['M', '91–96', '74–78', '70'],
                        ['L', '96–101', '78–82', '72'],
                        ['XL', '101–107', '82–88', '74'],
                        ['XXL', '107–114', '88–96', '76'],
                      ].map((row) => (
                        <tr key={row[0]}>
                          <td className="px-2 py-1.5 font-medium">{row[0]}</td>
                          <td className="px-2 py-1.5 text-center">{row[1]}</td>
                          <td className="px-2 py-1.5 text-center">{row[2]}</td>
                          <td className="px-2 py-1.5 text-center">{row[3]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pants / bottoms */}
              <div>
                <h3 className="text-sm font-semibold text-brand-900">Pants, skirts, trousers (waist)</h3>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-brand-50 text-brand-700">
                      <tr>
                        <th className="px-2 py-2 text-left">Size</th>
                        <th className="px-2 py-2">Waist (cm)</th>
                        <th className="px-2 py-2">Hips (cm)</th>
                        <th className="px-2 py-2">SA size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-100 text-brand-800">
                      {[
                        ['XS', '66–70', '90–94', '28–30'],
                        ['S', '70–74', '94–98', '30–32'],
                        ['M', '74–78', '98–102', '32–34'],
                        ['L', '78–82', '102–106', '34–36'],
                        ['XL', '82–88', '106–110', '36–38'],
                        ['XXL', '88–96', '110–116', '38–40'],
                      ].map((row) => (
                        <tr key={row[0]}>
                          <td className="px-2 py-1.5 font-medium">{row[0]}</td>
                          <td className="px-2 py-1.5 text-center">{row[1]}</td>
                          <td className="px-2 py-1.5 text-center">{row[2]}</td>
                          <td className="px-2 py-1.5 text-center">{row[3]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SA shoes */}
              <div>
                <h3 className="text-sm font-semibold text-brand-900">Shoes (UK / SA)</h3>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-brand-50 text-brand-700">
                      <tr>
                        <th className="px-2 py-2 text-left">EU</th>
                        <th className="px-2 py-2">UK / SA</th>
                        <th className="px-2 py-2">Foot length (cm)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-100 text-brand-800">
                      {[
                        ['36', '3', '23.0'],
                        ['37', '4', '23.7'],
                        ['38', '5', '24.3'],
                        ['39', '6', '25.0'],
                        ['40', '7', '25.7'],
                        ['41', '8', '26.3'],
                        ['42', '9', '27.0'],
                        ['43', '10', '27.7'],
                        ['44', '11', '28.3'],
                      ].map((row) => (
                        <tr key={row[0]}>
                          <td className="px-2 py-1.5 font-medium">{row[0]}</td>
                          <td className="px-2 py-1.5 text-center">{row[1]}</td>
                          <td className="px-2 py-1.5 text-center">{row[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-md bg-brand-50 p-3 text-xs text-brand-700 leading-relaxed">
                <p>
                  <strong className="text-brand-900">How to measure:</strong> Chest — around the fullest part, under the arms.
                  Waist — around the narrowest part of your torso. Hips — around the widest part of your hips.
                  For shoes — measure your foot length at the end of the day, standing.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-brand-200 px-5 py-3">
              <Button onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
