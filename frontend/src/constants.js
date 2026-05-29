export const SPEECH_PARTS = [
  { value: "noun", label: "Существительное" },
  { value: "verb", label: "Глагол" },
  { value: "adjective", label: "Прилагательное" },
  { value: "adverb", label: "Наречие" },
  { value: "pronoun", label: "Местоимение" },
  { value: "preposition", label: "Предлог" },
  { value: "conjunction", label: "Союз" },
  { value: "interjection", label: "Междометие" },
  { value: "phrasal_verb", label: "Фразовый глагол" },
  { value: "other", label: "Другое" },
];

export const ENTRY_TYPES = [
  { value: "word", label: "Слово" },
  { value: "phrase", label: "Фраза" },
];

export const SORT_OPTIONS = [
  { value: "updated_at_desc", label: "Недавно обновлённые" },
  { value: "updated_at_asc", label: "Давно обновлённые" },
  { value: "created_at_desc", label: "Сначала новые" },
  { value: "created_at_asc", label: "Сначала старые" },
  { value: "word_asc", label: "Слово А→Я" },
  { value: "word_desc", label: "Слово Я→А" },
  { value: "mastery_asc", label: "Изученность ↑" },
  { value: "mastery_desc", label: "Изученность ↓" },
];

export const SPEECH_PART_LABELS = Object.fromEntries(
  SPEECH_PARTS.map((x) => [x.value, x.label])
);

export const ENTRY_TYPE_LABELS = Object.fromEntries(
  ENTRY_TYPES.map((x) => [x.value, x.label])
);
