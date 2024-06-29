import { ActionPanel, Action, List, showToast, Toast, Clipboard, Icon, Grid } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs/promises";
import path from "path";

interface AWSIcon {
  name: string;
  category: string;
  type: "Architecture" | "Resource" | "Category" | "Architecture Group";
  formats: string[];
  path: string;
}

const ASSET_DIR = "Asset-Package_06072024.b5d9f0b1179c4a995a3f1e42042defabb0ba0fd2";

async function loadIconsData(): Promise<AWSIcon[]> {
  const icons: AWSIcon[] = [];
  const baseDir = path.join(__dirname, "assets", ASSET_DIR);

  console.log("Starting to load icons data");
  console.log("Base directory:", baseDir);

  try {
    await fs.access(baseDir);
    console.log("Asset directory exists and is accessible");

    const listFilePath = path.join(baseDir, "find.txt");
    console.log(`Reading list file from: ${listFilePath}`);
    const listFileContent = await fs.readFile(listFilePath, "utf-8");
    const items = listFileContent.split("\n").filter(item => item.trim() !== "");

    console.log(`Found ${items.length} items in find.txt`);
    console.log("Items:", items);

    for (const item of items) {
      if (!item.startsWith(".")) {
        continue;
      }
      const itemPath = path.join(baseDir, item);
      const itemStat = await fs.stat(itemPath);

      if (itemStat.isFile()) {
        const { icon, format } = extractIconData(item, itemPath);
        if (icon) {
          const existingIcon = icons.find(i => i.name === icon.name && i.category === icon.category && i.type === icon.type);
          if (existingIcon) {
            if (!existingIcon.formats.includes(format)) {
              existingIcon.formats.push(format);
              console.log(`Added ${format} format to existing icon: ${icon.name}`);
            }
          } else {
            icon.formats.push(format);
            icons.push(icon);
            console.log(`Added new icon: ${JSON.stringify(icon)}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error loading icons data:", error);
  }

  return icons;
}

function extractIconData(item: string, itemPath: string): { icon: AWSIcon | null, format: string } {
  const parts = item.split("/");
  if (parts.length < 3) {
    console.log("Invalid item path:", item);
    return { icon: null, format: "" };
  }

  const category = parts[1];
  const filename = parts[parts.length - 1];
  const nameParts = filename.split(".");
  const format = nameParts.pop();
  const name = nameParts.join(".");

  if (!format || !name) {
    console.log("Invalid filename format:", filename);
    return { icon: null, format: "" };
  }

  const type = getTypeFromCategory(category);

  const icon: AWSIcon = {
    name: name,
    category: category,
    type: type,
    formats: [],
    path: itemPath
  };

  return { icon, format };
}

function getTypeFromCategory(category: string): "Architecture" | "Resource" | "Category" | "Architecture Group" {
  if (category.includes("Arch")) {
    return "Architecture";
  } else if (category.includes("Res")) {
    return "Resource";
  } else if (category.includes("Cat")) {
    return "Category";
  } else {
    return "Architecture Group";
  }
}

export default function Command() {
  const [icons, setIcons] = useState<AWSIcon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIcons() {
      try {
        const iconsData = await loadIconsData();
        setIcons(iconsData);
      } catch (err) {
        setError("Failed to load icons data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchIcons();
  }, []);

  const copyIconToClipboard = async (icon: AWSIcon, format: "png" | "svg") => {
    try {
      await fs.access(icon.path);
      console.log(`Copying icon from: ${icon.path}`);

      // Copy the image to clipboard
      await Clipboard.copy({ file: icon.path });

      showToast({
        style: Toast.Style.Success,
        title: `${format.toUpperCase()} icon copied to clipboard`,
        message: "Paste it wherever you need.",
      });
    } catch (error) {
      console.error(`Failed to copy ${format} icon:`, error);
      showToast({
        style: Toast.Style.Failure,
        title: `Failed to copy ${format.toUpperCase()} icon to clipboard`,
        message: "The icon file might not exist or be accessible.",
      });
    }
  };

  const truncate = (str: string, maxLength: number) => {
    if (str.length <= maxLength) {
      return str;
    }
    return str.slice(0, maxLength) + "...";
  };

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
    return <List><List.EmptyView title="Error" description={error} /></List>;
  }

  console.log(`Rendering ${icons.length} icons`);

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Search AWS icons...">
      {icons.map((icon) => {
        console.log(`Rendering icon: ${icon.name}, Path: ${icon.path}`);
        return (
          <Grid.Item
            key={`${icon.type}-${icon.name}-${icon.category}`}
            content={{
              value: { source: icon.path },
              tooltip: `${icon.name} (${icon.type})`,
            }}
            title={truncate(icon.name, 20)}  // 名前を20文字に短縮
            subtitle={`${icon.type} - ${icon.category}`}
            actions={
              <ActionPanel>
                <Action
                  title="Copy PNG"
                  onAction={() => copyIconToClipboard(icon, "png")}
                />
                
                <Action
                  title="Copy SVG"
                  onAction={() => copyIconToClipboard(icon, "svg")}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
