import type { FormHTMLAttributes } from "react";
import clsx from "clsx";

interface FormPropsInterface extends FormHTMLAttributes<unknown> {
  rootClass?: string;
}

export default function Form(props: FormPropsInterface) {
  const { rootClass, autoComplete, ...restProps } = props;
  return (
    <form
      {...restProps}
      autoComplete={autoComplete === undefined ? "off" : autoComplete}
      className={clsx(
        "app-form",
        rootClass !== undefined && rootClass !== "" && rootClass
      )}
    />
  );
}
