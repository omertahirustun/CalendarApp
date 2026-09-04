import { forwardRef, useImperativeHandle, useState } from "react";
import { View } from "react-native";

const PagerView = forwardRef<any, any>(({ children, initialPage = 0, onPageSelected, style }, ref) => {
  const [page] = useState(initialPage);

  useImperativeHandle(ref, () => ({
    setPage: () => {},
    setPageWithoutAnimation: () => {},
  }));

  return <View style={style}>{children?.[page] ?? null}</View>;
});

PagerView.displayName = "PagerView";
export default PagerView;
