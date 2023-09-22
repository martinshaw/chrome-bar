export const containsObject = (
  obj: Object,
  list: any[],
  suffix: string = ""
) => {
  let i;
  for (i in list) {
    if (list.hasOwnProperty(i) && list[i][suffix] === obj) {
      return true;
    }
  }

  return false;
};

export const isInteger = (n: any): n is number => {
  return n == +n && n == (n | 0);
};

export const isNumeric = (n: number | string): boolean => {
  return !isNaN(Number(n.toString().trim()));
};

export const isElementVisible = (
  element: HTMLElement
): element is HTMLElement => {
  const rect = element.getBoundingClientRect(),
    vWidth = window.innerWidth || document.documentElement.clientWidth,
    vHeight = window.innerHeight || document.documentElement.clientHeight;

  // Return false if it's not in the viewport
  if (
    rect.right < 0 ||
    rect.bottom < 0 ||
    rect.left > vWidth ||
    rect.top > vHeight
  )
    return false;

  // Return true if any of its four corners are visible
  return (
    element.contains(document.elementFromPoint(rect.left, rect.top)) ||
    element.contains(document.elementFromPoint(rect.right, rect.top)) ||
    element.contains(document.elementFromPoint(rect.right, rect.bottom)) ||
    element.contains(document.elementFromPoint(rect.left, rect.bottom))
  );
};

export const currentSelectedElementIsInput = () =>
  document.activeElement?.tagName === "INPUT" ||
  document.activeElement?.tagName === "TEXTAREA";

export const isAMac = () =>
  navigator.platform.toUpperCase().indexOf("MAC") >= 0;
