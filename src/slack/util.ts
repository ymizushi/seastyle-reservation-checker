type Section = "section";
type Divider = "divider";

type AccessoryType = "image";
type Accessory = {
  type: AccessoryType;
  image_url: string;
  alt_text: string;
};

type Markdown = "mrkdwn";
type TextType = Markdown;
type Text = {
  type: TextType;
  text: string;
};

export type Block =
  | {
      type: Section;
      text?: Text;
      accessory?: Accessory;
    }
  | {
      type: Divider;
    };

type Payloads = {
  text: string;
  blocks?: Block[];
};

export async function notifySlack(
  payloads: Payloads,
  url: string
): Promise<Response> {
  return await postData(url, payloads);
}

async function postData(url = "", data: Record<string, any>) {
  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function createBlock(
  text: string,
  imageUrl?: string,
  altText?: string
): Block {
  const block: Block = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: text,
    },
  };
  if (imageUrl) {
    return {
      ...block,
      type: "section",
      accessory: {
        type: "image",
        image_url: imageUrl,
        alt_text: altText ?? "",
      },
    };
  }
  return block;
}
