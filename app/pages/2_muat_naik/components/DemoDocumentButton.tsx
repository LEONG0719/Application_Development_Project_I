import Icon from "../../../components/Icon";

export default function DemoDocumentButton() {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#DCE2F1] bg-white px-5 text-xs font-extrabold text-dark-blue shadow-sm transition hover:border-[#C8D2EA] hover:bg-[#FBFCFF]"
    >
      <Icon icon="download" size={17} weight={600} />
      Demo Document
    </button>
  );
}
