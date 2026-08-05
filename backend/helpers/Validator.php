<?php

declare(strict_types=1);

final class Validator
{
    private array $errors = [];
    private array $data = [];

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public static function make(array $data): self
    {
        return new self($data);
    }

    public function required(string $field, ?string $label = null): self
    {
        $label = $label ?? $field;
        $value = $this->data[$field] ?? null;

        if ($value === null || (is_string($value) && trim($value) === '')) {
            $this->errors[$field][] = "{$label} is required.";
        }

        return $this;
    }

    public function email(string $field, ?string $label = null): self
    {
        $label = $label ?? $field;
        $value = $this->data[$field] ?? null;

        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field][] = "{$label} must be a valid email address.";
        }

        return $this;
    }

    public function min(string $field, int $min, ?string $label = null): self
    {
        $label = $label ?? $field;
        $value = $this->data[$field] ?? null;

        if (is_string($value) && mb_strlen($value) < $min) {
            $this->errors[$field][] = "{$label} must be at least {$min} characters.";
        }

        if (is_numeric($value) && (float) $value < $min) {
            $this->errors[$field][] = "{$label} must be at least {$min}.";
        }

        return $this;
    }

    public function max(string $field, int $max, ?string $label = null): self
    {
        $label = $label ?? $field;
        $value = $this->data[$field] ?? null;

        if (is_string($value) && mb_strlen($value) > $max) {
            $this->errors[$field][] = "{$label} must not exceed {$max} characters.";
        }

        if (is_numeric($value) && (float) $value > $max) {
            $this->errors[$field][] = "{$label} must not exceed {$max}.";
        }

        return $this;
    }

    public function numeric(string $field, ?string $label = null): self
    {
        $label = $label ?? $field;
        $value = $this->data[$field] ?? null;

        if ($value !== null && $value !== '' && !is_numeric($value)) {
            $this->errors[$field][] = "{$label} must be numeric.";
        }

        return $this;
    }

    public function integer(string $field, ?string $label = null): self
    {
        $label = $label ?? $field;
        $value = $this->data[$field] ?? null;

        if ($value !== null && $value !== '' && filter_var($value, FILTER_VALIDATE_INT) === false) {
            $this->errors[$field][] = "{$label} must be an integer.";
        }

        return $this;
    }

    public function in(string $field, array $allowed, ?string $label = null): self
    {
        $label = $label ?? $field;
        $value = $this->data[$field] ?? null;

        if ($value !== null && $value !== '' && !in_array($value, $allowed, true)) {
            $this->errors[$field][] = "{$label} has an invalid value.";
        }

        return $this;
    }

    public function confirmed(string $field, ?string $label = null): self
    {
        $label = $label ?? $field;
        $value = $this->data[$field] ?? null;
        $confirmation = $this->data[$field . '_confirmation'] ?? null;

        if ($value !== $confirmation) {
            $this->errors[$field][] = "{$label} confirmation does not match.";
        }

        return $this;
    }

    public function unique(PDO $pdo, string $field, string $table, string $column, ?int $exceptId = null): self
    {
        $value = $this->data[$field] ?? null;

        if ($value === null || $value === '') {
            return $this;
        }

        $sql = "SELECT id FROM {$table} WHERE {$column} = :value";
        $params = ['value' => $value];

        if ($exceptId !== null) {
            $sql .= ' AND id != :except_id';
            $params['except_id'] = $exceptId;
        }

        $sql .= ' LIMIT 1';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        if ($stmt->fetch()) {
            $this->errors[$field][] = ucfirst($field) . ' is already taken.';
        }

        return $this;
    }

    public function phone(string $field, ?string $label = null): self
    {
        $label = $label ?? $field;
        $value = $this->data[$field] ?? null;

        if ($value !== null && $value !== '' && !preg_match('/^[6-9]\d{9}$/', (string) $value)) {
            $this->errors[$field][] = "{$label} must be a valid 10-digit Indian mobile number.";
        }

        return $this;
    }

    public function fails(): bool
    {
        return !empty($this->errors);
    }

    public function passes(): bool
    {
        return empty($this->errors);
    }

    public function errors(): array
    {
        return $this->errors;
    }

    public function firstError(): ?string
    {
        foreach ($this->errors as $fieldErrors) {
            if (!empty($fieldErrors[0])) {
                return $fieldErrors[0];
            }
        }

        return null;
    }
}
