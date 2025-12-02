import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  /**
   * The markdown content to render
   */
  content: string;
  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
}

/**
 * A reusable Markdown component that renders markdown content with consistent styling
 * Supports standard markdown elements including headings, lists, code blocks, links, tables, etc.
 * Uses remark-gfm for GitHub Flavored Markdown support (tables, strikethrough, task lists)
 */
export function Markdown({ content, className = "" }: MarkdownProps) {
  return (
    <div
      className={`leading-6
        [&_p]:mb-2 [&_p:last-child]:mb-0
        [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4 [&_h1:first-child]:mt-0
        [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2:first-child]:mt-0
        [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2
        [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2
        [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2
        [&_li]:mb-1
        [&_code]:bg-gray-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
        [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0
        [&_strong]:font-semibold
        [&_em]:italic
        [&_a]:text-blue-600 [&_a]:underline
        [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2
        [&_table]:w-full [&_table]:border-collapse [&_table]:my-3
        [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-sm
        [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm
        [&_tr:hover]:bg-gray-50
        [&_del]:line-through [&_del]:text-gray-500
        ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
