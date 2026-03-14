export const getRootFileUrl = (filename: string) => {
  return new URL(`../${filename}`, import.meta.url)
}