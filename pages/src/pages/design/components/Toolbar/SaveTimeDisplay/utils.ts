import moment from 'dayjs';
/**
 * 统一展示时间处理
 * @param time 时间
 * @returns    最终展示的时间格式
 */
export function unifiedTime(time: string | number | Date) {
  if (isToday(time)) {
    return moment(time).format('HH:mm');
  } else if (isThisYear(time)) {
    return moment(time).format('M月D日 HH:mm');
  }

  return moment(time).format('YYYY年M月D日');
}


/**
 * 判断时间是否今天
 * @param time 时间
 * @returns    是否今天
 */
function isToday(time: string | number | Date) {
  const t = moment(time).format('YYYY-MM-DD');
  const n = moment().format('YYYY-MM-DD');

  return t === n;
}

/**
 * 判断时间是否今年
 * @param time 时间
 * @returns    是否今年
 */
function isThisYear(time: string | number | Date) {
  const t = moment(time).format('YYYY');
  const n = moment().format('YYYY');

  return t === n;
}