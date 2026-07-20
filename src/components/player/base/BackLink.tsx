import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Icon, Icons } from "@/components/Icon";

export function BackLink(props: { url: string; onBack?: () => void }) {
  const { t } = useTranslation();
  const className =
    "py-1 -my-1 px-1.5 ssm:px-2 -mx-1 ssm:-mx-2 tabbable rounded-lg flex items-center cursor-pointer text-type-secondary hover:text-white transition-colors duration-200 font-medium shrink-0";

  const contents = (
    <>
      <Icon className="mr-0 ssm:mr-1.5 md:mr-2 text-lg" icon={Icons.ARROW_LEFT} />
      {/* Icon-only on the narrowest phones; short label from ssm up; full on md+ */}
      <span className="hidden ssm:inline md:hidden">{t("player.back.short")}</span>
      <span className="hidden md:block">{t("player.back.default")}</span>
    </>
  );

  return (
    <div className="flex items-center">
      {props.onBack ? (
        <button type="button" onClick={props.onBack} className={className}>
          {contents}
        </button>
      ) : (
        <Link to={props.url} className={className}>
          {contents}
        </Link>
      )}
    </div>
  );
}
