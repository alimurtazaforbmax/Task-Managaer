from rest_framework.pagination import PageNumberPagination

from apps.core.responses import success_response


class StandardPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return success_response(
            data={
                "results": data,
                "count": self.page.paginator.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
            },
            message="",
        )


def paginate_action_list(request, queryset, serializer_class, *, context=None):
    """Paginate a queryset inside a custom @action list handler."""
    paginator = StandardPagination()
    page = paginator.paginate_queryset(queryset, request)
    ctx = context if context is not None else {}
    if page is not None:
        serializer = serializer_class(page, many=True, context=ctx)
        return paginator.get_paginated_response(serializer.data)
    serializer = serializer_class(queryset, many=True, context=ctx)
    return success_response(data=serializer.data)
