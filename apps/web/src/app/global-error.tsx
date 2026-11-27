"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="uk">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-[#fcf8f3] px-4 text-center text-[#261b14]">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold">Щось пішло не так</h1>
          <p className="text-sm text-[#6b5a4e]">
            Виникла тимчасова технічна помилка. Спробуйте оновити сторінку або повернутися на
            головну.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer rounded-md bg-[#c0562b] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Спробувати ще раз
            </button>
            <a
              href="/uk"
              className="rounded-md border border-[#e5d8c8] bg-white px-4 py-2 text-sm font-medium text-[#261b14] hover:bg-[#f3ebe0]"
            >
              На головну
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
