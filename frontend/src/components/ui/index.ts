/**
 * Primitivas del sistema de diseño de AsistíAPP (Fase 13.2). Recetas y reglas de uso en
 * DESIGN.md → "Component Patterns". Las pantallas importan desde acá:
 *
 *   import { Button, Field, Input, StatusBadge } from "../../components/ui";
 */
export { Button, IconButton, type ButtonProps, type ButtonSize, type ButtonVariant, type IconButtonProps } from "./Button";
export { claseBoton } from "./buttonStyles";
export { Spinner } from "./Spinner";
export { Tooltip } from "./Tooltip";
export { Field, Input, Textarea, Select, type InputProps, type SelectProps, type TextareaProps } from "./Field";
export { PasswordInput } from "./PasswordInput";
export { Checkbox, Switch, RadioCardGroup, type RadioCardOption } from "./Selection";
export { Badge, StatusBadge } from "./Badge";
export { Alert, type AlertTone } from "./Alert";
export { Card, CardHeader } from "./Card";
export { PageHeader } from "./PageHeader";
export { StatCard } from "./StatCard";
export { Skeleton, EmptyState, ErrorState } from "./States";
export { Menu, type MenuItem } from "./Menu";
export { QuantityStepper, StickyActionBar } from "./Purchase";
