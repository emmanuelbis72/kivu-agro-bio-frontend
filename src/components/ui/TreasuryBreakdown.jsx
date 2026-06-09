function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD"
  }).format(Number(value || 0));
}

export default function TreasuryBreakdown({
  cashOnHand = 0,
  bank = 0,
  mobileMoney = 0,
  other = 0,
  header = null
}) {
  const breakdownItems = [
    { key: "cash", label: "Caisse", value: cashOnHand },
    { key: "bank", label: "Banque", value: bank },
    { key: "mobile-money", label: "Mobile money", value: mobileMoney }
  ];

  if (Math.abs(Number(other || 0)) > 0.004) {
    breakdownItems.push({
      key: "other",
      label: "Autres",
      value: other
    });
  }

  return (
    <div className="space-y-1.5">
      {header ? <div>{header}</div> : null}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
        {breakdownItems.map((item) => (
          <span key={item.key}>
            {item.label}: {formatMoney(item.value)}
          </span>
        ))}
      </div>
    </div>
  );
}
