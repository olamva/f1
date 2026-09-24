const CODES: Record<string, string> = {
  "Abu Dhabi": "AE",
  Australia: "AU",
  Austria: "AT",
  Azerbaijan: "AZ",
  Bahrain: "BH",
  Belgium: "BE",
  Brazil: "BR",
  Canada: "CA",
  China: "CN",
  France: "FR",
  Germany: "DE",
  Hungary: "HU",
  Italy: "IT",
  Japan: "JP",
  Malaysia: "MY",
  Mexico: "MX",
  Monaco: "MC",
  Netherlands: "NL",
  Portugal: "PT",
  Qatar: "QA",
  Russia: "RU",
  "Saudi Arabia": "SA",
  Singapore: "SG",
  Spain: "ES",
  Turkey: "TR",
  UAE: "AE",
  UK: "GB",
  "United Arab Emirates": "AE",
  "United Kingdom": "GB",
  "United States": "US",
  USA: "US",
};

export const Flag = ({ country }: { country?: string }) => {
  const code = CODES[country ?? ""];
  return code ? (
    <span aria-hidden="true" className="mr-1.5">
      {String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)))}
    </span>
  ) : null;
};
