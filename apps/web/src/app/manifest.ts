import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Смаколик — Кулінарна книга",
    short_name: "Смаколик",
    description: "Домашня кулінарна книга з калькулятором порцій та розумним AI-імпортом",
    start_url: "/uk",
    display: "standalone",
    background_color: "#fcf8f3",
    theme_color: "#c0562b",
    share_target: {
      action: "/uk/recipes/new",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
}
