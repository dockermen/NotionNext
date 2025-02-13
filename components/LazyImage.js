import { siteConfig } from '@/lib/config' // 导入 siteConfig 方法，用于获取站点配置
import Head from 'next/head' // 导入 Head 组件，用于在 Next.js 中管理文档的 <head> 标签
import { useEffect, useRef, useState } from 'react' // 导入 React 的三个 Hook：useEffect、useRef 和 useState，分别用于副作用处理、引用 DOM 元素和管理组件状态

/**
 * LazyImage 组件用于实现图片的懒加载功能
 * @param {Object} props - 组件的属性
 * @returns {JSX.Element|null} - 返回图片元素或null
 */
export default function LazyImage({
  priority, // 是否优先加载
  id, // 图片的ID
  src, // 图片的源地址
  alt, // 图片的替代文本
  placeholderSrc, // 占位符图片的源地址
  className, // 图片的类名
  width, // 图片的宽度
  height, // 图片的高度
  title, // 图片的标题
  onLoad, // 图片加载完成的回调函数
  onClick, // 图片点击的回调函数
  style // 图片的样式
}) {
  // 获取图片最大压缩宽度和默认占位符图片地址
  const maxWidth = siteConfig('IMAGE_COMPRESS_WIDTH')
  const defaultPlaceholderSrc = siteConfig('IMG_LAZY_LOAD_PLACEHOLDER')
  const imageRef = useRef(null) // 创建一个引用来访问DOM元素
  const [currentSrc, setCurrentSrc] = useState(
    placeholderSrc || defaultPlaceholderSrc // 初始化图片源为占位符
  )

  /**
   * 占位图加载成功的处理函数
   */
  const handleThumbnailLoaded = () => {
    if (typeof onLoad === 'function') {
      // 如果传递了onLoad回调函数，则调用它
      // onLoad() // 触发传递的onLoad回调函数
    }
  }

  /**
   * 原图加载完成的处理函数
   * @param {string} img - 加载完成的图片源
   */
  const handleImageLoaded = img => {
    if (typeof onLoad === 'function') {
      onLoad() // 触发传递的onLoad回调函数
    }
    // 移除占位符类名
    if (imageRef.current) {
      imageRef.current.classList.remove('lazy-image-placeholder')
    }
  }

  /**
   * 图片加载失败的处理函数
   */
  const handleImageError = () => {
    if (imageRef.current) {
      // 尝试加载 placeholderSrc，如果失败则加载 defaultPlaceholderSrc
      if (imageRef.current.src !== placeholderSrc && placeholderSrc) {
        imageRef.current.src = placeholderSrc
      } else {
        imageRef.current.src = defaultPlaceholderSrc
      }
      // 移除占位符类名
      if (imageRef.current) {
        imageRef.current.classList.remove('lazy-image-placeholder')
      }
    }
  }

  useEffect(() => {
    // 调整图片尺寸
    const adjustedImageSrc =
      adjustImgSize(src, maxWidth) || defaultPlaceholderSrc

    // 创建IntersectionObserver实例，用于懒加载图片
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 当图片进入视口时，开始加载图片
            const img = new Image()
            img.src = adjustedImageSrc
            img.onload = () => {
              setCurrentSrc(adjustedImageSrc) // 更新图片源
              handleImageLoaded(adjustedImageSrc) // 调用图片加载完成的处理函数
            }
            img.onerror = handleImageError // 设置图片加载失败的处理函数

            observer.unobserve(entry.target) // 停止观察当前图片
          }
        })
      },
      { rootMargin: '50px 0px' } // 设置提前加载的距离
    )
    if (imageRef.current) {
      observer.observe(imageRef.current) // 开始观察图片
    }
    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current) // 组件卸载时停止观察
      }
    }
  }, [src, maxWidth])

  // 动态添加width、height和className属性，仅在它们为有效值时添加
  const imgProps = {
    ref: imageRef,
    src: currentSrc,
    'data-src': src, // 存储原始图片地址
    alt: alt || 'Lazy loaded image',
    onLoad: handleThumbnailLoaded,
    onError: handleImageError,
    className: `${className || ''} lazy-image-placeholder`,
    style,
    width: width || 'auto',
    height: height || 'auto',
    onClick
  }

  if (id) imgProps.id = id // 如果提供了id，则添加到imgProps
  if (title) imgProps.title = title // 如果提供了title，则添加到imgProps

  if (!src) {
    return null // 如果没有提供src，则返回null
  }

  return (
    <>
      {/* 使用img标签显示图片 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...imgProps} />
      {/* 如果设置了priority，则预加载图片 */}
      {priority && (
        <Head>
          <link rel='preload' as='image' href={adjustImgSize(src, maxWidth)} />
        </Head>
      )}
      {/* 定义占位符的样式和动画 */}
      <style>
        {` 
        .lazy-image-placeholder{
            background: 
                linear-gradient(90deg,#0001 33%,#0005 50%,#0001 66%)
                #f2f2f2;
            background-size:300% 100%;
            animation: l1 1s infinite linear;
            }
            @keyframes l1 {
            0% {background-position: right}
        }
        `}
      </style>
    </>
  )
}

/**
 * 根据窗口尺寸决定压缩图片宽度
 * @param {string} src - 图片的源地址
 * @param {number} maxWidth - 最大宽度
 * @returns {string|null} - 返回调整后的图片地址或null
 */
const adjustImgSize = (src, maxWidth) => {
  if (!src) {
    return null // 如果没有提供src，则返回null
  }
  const screenWidth =
    (typeof window !== 'undefined' && window?.screen?.width) || maxWidth

  // 如果屏幕尺寸大于默认图片尺寸，则不需要压缩
  if (screenWidth > maxWidth) {
    return src
  }

  // 正则表达式，用于匹配 URL 中的 width 参数
  const widthRegex = /width=\d+/
  // 正则表达式，用于匹配 URL 中的 w 参数
  const wRegex = /w=\d+/

  // 使用正则表达式替换 width/w 参数
  return src
    .replace(widthRegex, `width=${screenWidth}`)
    .replace(wRegex, `w=${screenWidth}`)
}
