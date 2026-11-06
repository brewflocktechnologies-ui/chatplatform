import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { productByIdOptions } from '@/features/products/api/queries';
import PageContainer from '@/components/layout/page-container';
import ProductViewPage from '@/features/products/components/product-view-page';

export const metadata = {
  title: 'Dashboard : Product View'
};

type PageProps = { params: Promise<{ productId: string }> };

export default async function Page(props: Readonly<PageProps>) {
  const params = await props.params;
  const queryClient = getQueryClient();

  if (params.productId !== 'new') {
    // Prefetch is best-effort: a failure falls back to the client-side fetch.
    void queryClient.query(productByIdOptions(Number(params.productId))).catch(() => {});
  }

  return (
    <PageContainer>
      <div className='flex-1 space-y-4'>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ProductViewPage productId={params.productId} />
        </HydrationBoundary>
      </div>
    </PageContainer>
  );
}
